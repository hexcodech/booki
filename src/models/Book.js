const Book = ({
	sequelize, errorController, config, models
}) => {

	const get       = require('lodash/get');
	const pick      = require('lodash/pick');

	const Sequelize = require('sequelize');
	const request   = require('request');
	const gbooks    = require('google-books-search');

	let Book					= sequelize.define('book', {

		isbn13: {
			type        : Sequelize.STRING,
			validate    : {
				isIsbn      : (value) => {
					if(value.indexOf('-') !== -1 && value.length !== 13){
						throw new Error('Invalid isbn 13');
					}
				}
			}
		},

		title: {
			type         : Sequelize.STRING,
		},

		subtitle: {
			type         : Sequelize.STRING,
		},

		language: {
			type         : Sequelize.STRING,
			validate     : {
				isIn         : [config.LOCALES],
			}
		},

		description: {
			type         : Sequelize.STRING,
		},

		publisher: {
			type         : Sequelize.STRING,
		},

		publicationDate: {
			type         : Sequelize.DATE,
		},

		pageCount: {
			type         : Sequelize.INTEGER,
		},

		approved: {
			type         : Sequelize.BOOLEAN,
		},

	}, {
		defaultScope: {
			include: [
				{
					model    : models.Image,
					as       : 'Image'
				}
			]
		},

		classMethods: {
    	associate: function({User, Image}){
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id'
				});
				this.belongsTo(Image, {
					as         : 'Cover',
					foreignKey : 'cover_image_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			},

			findOnGoogle: function(
				value  = '',
				field  = 'isbn',
				offset = 0,
				limit  = 10,
				type   = 'all',
				order  = 'relevance',
				lang   = ''
			){
				return new Promise((reject, resolve) => {
					let {_, gbooks, errorController} = this;

					gbooks.search(value, {field, type, offset, limit, type, order, lang},
					(err, books) => {

						if(err){
							return reject(new errorController.errors.ApiError({
								message: err.message
							}));
						}

						if(books.length === 0){
							return resolve([]);
						}


						return resolve(books.map((book) => {

							let isbn = '';

							for(let i=0;i<book.industryIdentifiers.length;i++){
								if(book.industryIdentifiers[i].type === 'ISBN_13'){
									isbn = book.industryIdentifiers[i].identifier;
								}
							}

							let cover = models.Image.build({
								url: get(book, 'images.extraLarge')

								   ? get(book, 'images.extraLarge') :
										 get(book, 'images.large')

									 ? get(book, 'images.large')      :
										 get(book, 'images.medium')

									 ? get(book, 'images.medium')     :
										 get(book, 'images.small')

									 ? get(book, 'images.small')      :
										 get(book, 'thumbnail')
							});

							book = this.build({
								isbn13           : isbn,

								title            : get(book, 'title'),
								subtitle         : get(book, 'subtitle'),

								language         : get(book, 'language'),

								//FIXME authors field not valid anymore
								authors          : get(book, 'authors'),

								description      : get(book, 'description'),

								publisher        : get(book, 'publisher'),
								publicationDate  : new Date(get(book, 'publishedDate')),

								pageCount        : get(book, 'pageCount')
							});

							book.setCoverImage(cover);

							return book;

						}));

					});
				});
			},

			lookupByIsbn: function(isbn = '', page = 0){
				return new Promise((reject, resolve) => {

					let {errorController} = this;

					isbn = isbn.replace(/(-|\s)/g, ''); //remove spaces and dashes

					if(isbn.length === 10){ //convert isbn10 to isbn13
						isbn = '978' + isbn;
					}

					//even tought this function shouldn't even be called if the book is already present, we double check
					this.find({where: {isbn13: isbn}}).then((books) => {

						if(books){
							//the isbn is already in our database
							return resolve(books);

						}else{
							//let the games begin

							let promises = [];

							//lets start with google books

							promises.push(this.findOnGoogle(
								isbn, 'isbn', 10 * page, 10, 'all', 'relevance', ''
							));

							Promises.all(promises).then((bookArrays) => {

								resolve([].concat.apply([], bookArrays)); //flatten array

							}).catch((error) => {
								reject(error);
							});
						}

					}).catch((err) => {
						reject(new errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				});
			},

			lookupByTitle: function(title = '', page = 0){
				let likeQuery = '%' + title.replace('_', '\_').replace('%', '\%') + '%';

				return new Promise((reject, resolve) => {
					this.find({where: {$or: [
						{title     : likeQuery},
						{subtitle  : likeQuery}
					]}}).then((books) => {

						let promises = [];

						promises.push(this.findOnGoogle(
							title, 'title', 10 * page, 10, 'all', 'relevance', ''
						));

						Promise.all(promises).then((bookArrays) => {

							resolve([].concat.apply(books, bookArrays)); //flatten array

						}).catch((error) => {
							reject(error);
						});

					}).catch((err) => {
						reject(new errorController.errors.DatabaseError({
							message: err.message
						}));
					});
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let book = this.get(); //invoking virtual getters

				let json = pick(book, [
					'id',          'title',     'subtitle',        'language',
					'description', 'publisher', 'publicationDate', 'pageCount',
					'approved',    'createdAt', 'updatedAt'
				]);

				json.coverImage = '';
				if(book.CoverImage){
					json.coverImage = book.CoverImage.toJSON(options);
				}

				return json;
			}
		}
	});

	//TODO add authors field

	return Book;

};

module.exports = Book;
