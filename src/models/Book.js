const Book = ({
	config, errorController, sequelize, sphinx, models
}) => {

	const get         = require('lodash/get');
	const pick        = require('lodash/pick');

	const Sequelize   = require('sequelize');
	const request     = require('request');
	const async       = require('async');

	const sphinxUtils = require('../utilities/SphinxUtilities');

	const amazon      = require('amazon-product-api');
	const amzClient   = amazon.createClient({
		awsId     : 'AKIAJ5VWP7D44KOSUT3A',
		awsSecret : '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',
		awsTag    : 'bookime-21'
	});

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

		verified: {
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

			lookup: function(text = '', page = 0){

				return new Promise((resolve, reject) => {

					//sphinx search
					sphinx.query(
						'SELECT id FROM books WHERE MATCH(?) OPTION field_weights=' +
						'(isbn13=100, title=5, subitle=3, desciption=1)',
						['@* *' + sphinxUtils.escape(text) + '*']
					).then((results) => {

						let dbBooks = [];

						async.each(results[0], (book, callback) => {
							this.findById(book.id).then((instance) => {
								if(instance){
									dbBooks.push(instance);
								}
								callback();
							}).catch((err) => {
								callback(err);
							});
						}, (err) => {
							if(err){
								reject(err);
							}

							let amazonBooks = [];

							//combine with external sources
							amzClient.itemSearch({
							  keywords      : text,
							  searchIndex   : 'Books',
							  responseGroup : 'ItemAttributes,Offers,Images',
								domain        : 'webservices.amazon.de'
							}).then((results) => {
							  amazonBooks = results.map((result) => {
									let attr = result.ItemAttributes[0];

									if(!attr.ISBN || !attr.ISBN[0]){
										return null;
									}

									return {
										isbn13          : attr.ISBN[0].length == 10 ?
										                  '978' + attr.ISBN[0] :
																			attr.ISBN[0],
										title           : attr.Title[0],
										subtitle        : attr.Title[1] ? attr.Title[1] : '',
										language        : attr.Languages
										                  [0].Language.Name,
										description     : '',
										publisher       : attr.Publisher[0],
										publicationDate : attr.PublicationDate ?
										                  attr.PublicationDate[0] : 0,
										pageCount       : attr.NumberOfPages ?
										                  attr.NumberOfPages[0] : 0,
										verified        : false,

										url             : result.DetailPageURL[0],
										authors         : attr.Author,
										thumbnail       : result.LargeImage[0].URL,

									};
								}).filter(e => e); //removes falsy elements

								return resolve({
									db       : dbBooks,
									external : amazonBooks
								});

							}).catch((err) => {
							  return reject(err);
							});
						});
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

							models.Person.searchByExactName(author).then((results) => {
								if(results[0].length === 1){//perfect match
									models.Person.findById(results[0][0].id).then((author) => {
										authorInstances.push(author);
										callback();

									}).catch((err) => {
										callback(err);
									});
								}else{
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

									author.set('verified', false);

									author.save().then(() => {

										authorInstances.push(author);
										callback();

									}).catch((err) => {
										callback(err);
									});
								}
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
					'id',        'isbn13',      'title',     'subtitle',
					'language',  'description', 'publisher', 'publicationDate',
					'pageCount', 'verified',    'createdAt', 'updatedAt'
				]);

				json.coverImage = '';
				if(book.CoverImage){
					json.coverImage = book.CoverImage.toJSON(options);
				}

				return json;
			}
		}
	});

	return Book;

};

module.exports = Book;
