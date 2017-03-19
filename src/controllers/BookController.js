class BookController{

	constructor({
		booki,     config,    sequelize, errorController,
		getLocale, generateRandomString, models
	}){

		const bindAll                     = require('lodash/bindAll');
		const pick                        = require('lodash/pick');
		const omitBy                      = require('lodash/omitBy');
		const isNil                       = require('lodash/isNil');

		const Sequelize                   = require('sequelize');

		this.config                       = config;
		this.errorController              = errorController;

		this.Book                         = models.Book;
		this.Image                        = models.Image;
		this.User                         = models.User;

		this.getLocale                    = getLocale;
		this.generateRandomString         = generateRandomString;

		bindAll(this, [
			'getBook', 'getBookById', 'postBook',
			'putBook', 'deleteBook',  'lookupBook'
		]);

	}

	getBook(request, response, next){

		let query  = {};
		let search =  request.body.search;
		//escape string

		search = search.replace('_', '\_');
		search = search.replace('%', '\%');

		let likeSearch = {'$like' : '%' + search + '%'};

		query['$or'] = [
			{isbn13       : likeSearch},
			{title        : likeSearch},
			{subtitle     : likeSearch},
			{description  : likeSearch},
			{publisher    : likeSearch},
		];

		this.Book.findAll({where: query}, (err, books) => {

			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}

			if(books){

				if(request.hasPermission('admin.book.hiddenData.read')){

					response.json(books.map((book) => {
						return book.toJSON({hiddenData: true});
					}));

				}else{

					response.json(books.map((book) => {
						return book.toJSON();
					}));

				}

				return response.end();

			}

			return next(new this.errorController.errors.UnexpectedQueryResultError());

		});

	}

	getBookById(request, response, next){
		this.Book.findById(request.params.bookId).then((book) => {

			if(book){

				if(request.hasPermission('admin.book.hiddenData.read')){
					response.json(book.toJSON({hiddenData: true}));
				}else{
					response.json(book.toJSON());
				}

				return response.end();
			}

			return next(new this.errorController.errors.UnexpectedQueryResultError());

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	postBook(request, response, next){

		let book = this.Book.build(pick(request.body.book, [
			'title',           'subtitle',    'language',
			'description',     'publisher',   'publicationDate',
			'pageCount'
		]));

		//check whether the cover actually exists
		this.Image.findById(request.body.book.coverId)
		.then((image) => {

			let promises = [];

			if(image){
				promises.push(book.setCoverImage(image));
			}else{
				//if not, use the default image
				//TODO add first default image database entry
				promises.push(book.setCoverImage(1));
			}

			//add additional fields
			if(request.hasPermissions([
				'admin.book.create', 'admin.book.hiddenData.write'
			])){

				book.set(pick(request.body.book, [
					'id', 'approved'
				]));

				if(request.body.book.userId){
					book.set('user', request.body.book.userId);
				}else{
					book.set('user', request.user.get('id'));
				}

			}else{
				book.set('user', request.user.get('id'));
			}

			//save and return it
			promises.push(book.save());
			Promise.all(promises).then((book) => {

				if(book){

					if(request.hasPermission('admin.book.hiddenData.read')){
						response.json(book.toJSON({hiddenData: true}));
					}else{
						response.json(book.toJSON());
					}

					return response.end();
				}

				return next(
					new this.errorController.errors.UnexpectedQueryResultError()
				);

			}).catch((err) => {
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			});

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

	putBook(request, response, next){

		this.Book.findOne({
			where   : {id: request.params.bookId},
			include : [{
				model   : this.User,
				as      : 'User'
			}, {
				model   : this.Image,
				as      : 'CoverImage'
			}]
		})
		.then((book) => {

			if(book){

				if(
					book.get('user').get('id') !== request.user.get('id') &&
					!request.hasPermission('admin.book.editOthers')
				){
					return next(new this.errorController.errors.ForbiddenError());
				}

				this.Image.findById(request.body.book.coverId)
				.then((image) => {

					let promises = [];

					if(image){
						promises.push(book.setCoverImage(image));
					}

					book.set(omitBy(pick(request.body.book, [
						'title',           'subtitle',    'language',
						'description',     'publisher',   'publicationDate',
						'pageCount'
					]), isNil));

					if(request.hasPermission('admin.book.hiddenData.write')){
						book.set(omitBy(pick(request.body.book, [
							'approved'
						]), isNil));

						if(request.body.book.userId){
							book.set('user', request.body.book.userId);
						}

					}

					promises.push(book.save());

					Promise.all(book).then(() => {

						if(request.hasPermission('admin.book.hiddenData.read')){
							response.json(book.toJSON({hiddenData: true}));
						}else{
							response.json(book.toJSON());
						}

						return response.end();

					}).catch((err) => {
						return next(new this.errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});

			}else{
				return next(new this.errorController.errors.NotFoundError());
			}

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	deleteBook(request, response, next){

		this.Book.findOne({
			where   : {id: request.params.bookId},
			include : [{
				model   : this.User,
				as      : 'User'
			}, {
				model   : this.Image,
				as      : 'CoverImage'
			}]
		}).then((book) => {

			if(!book){
				return next(new this.errorController.errors.NotFoundError());
			}
			//only admins can delete books
			if(!request.hasPermission('admin.book.deleteOthers')){
				return next(new this.errorController.errors.ForbiddenError());
			}

			book.destroy().then(() => {

				response.json({success: true});
				return response.end();

			}).catch((err) => {
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			});

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	lookupBook(request, response, next){

		if(request.query.isbn){

			return this.Book.lookupByIsbn(request.query.isbn)
			.then((books) => {

				if(request.hasPermission('admin.book.hiddenData.read')){
					response.json(books.map((book) => {
						return book.toJSON({hiddenData: true});
					}));
				}else{
					response.json(books.map((book) => {
						return book.toJSON();
					}));
				}

				return response.end();

			}).catch((error) => {
				return next(error);
			});

		}else if(request.query.title){

			return this.Book.lookupByTitle(request.query.title)
			.then((books) => {
				if(request.hasPermission('admin.book.hiddenData.read')){
					response.json(books.map((book) => {
						return book.toJSON({hiddenData: true});
					}));
				}else{
					response.json(books.map((book) => {
						return book.toJSON();
					}));
				}

				return response.end();
			}).catch((error) => {
				return next(error);
			});

		}

		return next(new this.errorController.errors.NotFoundError());

	}

}

module.exports = BookController;
