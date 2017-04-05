const Book = ({
	sequelize, errorController, config, models
}) => {

	const get       = require('lodash/get');
	const pick      = require('lodash/pick');

	const Sequelize = require('sequelize');
	const request   = require('request');
	const async     = require('async');

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
			default      : false
		},

	}, {
		defaultScope: {
			include: [
				{
					model    : models.Image,
					as       : 'Cover'
				}
			]
		},

		classMethods: {
    	associate: function({User, Image, Person}){
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id'
				});
				this.belongsTo(Image, {
					as         : 'Cover',
					foreignKey : 'cover_image_id'
				});
				this.belongsToMany(Person, {
					as         : 'Authors',
					foreignKey : 'book_id',
					otherKey   : 'author_id',
					through    : 'author_relations'
				});
			},

			lookupByIsbn: function(isbn = '', page = 0){
				let {errorController} = this;

				isbn = isbn.replace(/(-|\s)/g, ''); //remove spaces and dashes

				if(isbn.length === 10){ //convert isbn10 to isbn13
					isbn = '978' + isbn;
				}

				//even tought this function shouldn't even be called if the
				//book is already present, we double check
				return this.findAll({where: {isbn13: isbn}}).then((books) => {

					if(books){
						//the isbn is already in our database
						return resolve(books);

					}else{

						let promises = [];

						//use the amazon product advertising api

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
			},

			lookupByTitle: function(title = '', page = 0){
				let likeQuery = '%' + title.replace('_', '\_').replace('%', '\%') + '%';

				return this.findAll({where: {$or: [
					{title     : likeQuery},
					{subtitle  : likeQuery}
				]}}).then((books) => {

					let promises = [];

					promises.push(this.findOnGoogle(
						title, 'title', 10 * page, 10, 'all', 'relevance', ''
					));

					return Promise.all(promises).then((bookArrays) => {

						return [].concat.apply(books, bookArrays); //flatten array

					}).catch((error) => {
						throw error;
					});

				}).catch((err) => {
					throw new errorController.errors.DatabaseError({
						message: err.message
					});
				});

			}
  	},
  	instanceMethods: {
			setAuthorsRaw: function(authors){

				return new Promise((resolve, reject) => {

					let authorInstances = [];

					async.each(authors, (author, callback) => {

						if(isNan(author)){
							let parts = author.split(' ');

							if(parts.length === 0 || parts.length > 4){
								return;
							}


							let author = models.Person.build();

							switch(parts.length){
								case 1:
									author.set({
										'nameLast' : parts[0]
									});
									break;
								case 2:
									author.set({
										'nameFirst': parts[0],
										'nameLast' : parts[1]
									});
									break;
								case 3:
									author.set({
										'nameFirst'  : parts[0],
										'nameMiddle' : parts[1],
										'nameLast'   : parts[2]
									});
									break;

								case 4:
								default:
									author.set({
										'nameTitle'  : parts[0],
										'nameFirst'  : parts[1],
										'nameMiddle' : parts[2],
										'nameLast'   : parts[3]
									});
									break;
							}

							author.save().then(() => {

								authorInstances.push(author);
								callback();

							}).catch((err) => {
								callback(err);
							});

						}else{
							this.Person.findById(author).then((instance) => {
								if(instance){
									authorInstances.push(instance);
									callback();
								}else{
									callback(new Error('The author couldn\'t be found!'));
								}
							}).catch((err) => {
								callback(err);
							});

						}
					}, (err) => {
						if(err){
							return reject(err);
						}

						this.setAuthors(authorInstances).then(() => {
							resolve();
						}).catch((err) => {
							reject(err);
						});

					});
				});
			},
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
