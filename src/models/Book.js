const Book = ({ config, errorController, sequelize, models }) => {
	const get = require("lodash/get");
	const pick = require("lodash/pick");

	const Sequelize = require("sequelize");
	const request = require("request");
	const async = require("async");

	const amazon = require("amazon-product-api");

	const amzClient = amazon.createClient({
		awsId: config.AWS_ID,
		awsSecret: config.AWS_SECRET,
		awsTag: config.AWS_TAG
	});

	let Book = sequelize.define(
		"book",
		{
			isbn13: {
				type: Sequelize.STRING,
				validate: {
					isIsbn: value => {
						if (value.indexOf("-") !== -1 && value.length !== 13) {
							throw new Error("Invalid isbn 13");
						}
					}
				}
			},

			title: {
				type: Sequelize.STRING,
				default: ""
			},

			subtitle: {
				type: Sequelize.STRING,
				default: ""
			},

			language: {
				type: Sequelize.STRING,
				validate: {
					isIn: [config.LOCALES]
				}
			},

			description: {
				type: Sequelize.STRING(2000),
				default: ""
			},

			publisher: {
				type: Sequelize.STRING
			},

			publicationDate: {
				type: Sequelize.DATE
			},

			pageCount: {
				type: Sequelize.INTEGER
			},

			verified: {
				type: Sequelize.BOOLEAN,
				default: false
			}
		},
		{
			indexes: [
				{
					type: "FULLTEXT",
					name: "book_fulltext_idx",
					fields: ["title", "subtitle", "description", "publisher", "isbn13"]
				}
			],

			defaultScope: {
				/*include: [
					{
						model: models.Person,
						as: "Authors"
					},
					{
						model: models.Image,
						as: "Cover"
					},
					{
						model: models.Offer,
						as: "Offers"
					}
				]*/
			},

			classMethods: {
				associate: function({ User, Image, Person, Offer }) {
					this.belongsTo(User, {
						as: "User",
						foreignKey: "user_id"
					});
					this.belongsTo(Image, {
						as: "Cover",
						foreignKey: "cover_image_id",
						onDelete: "cascade",
						hooks: true
					});
					this.hasMany(Offer, {
						as: "Offers",
						foreignKey: "book_id",
						onDelete: "cascade",
						hooks: true
					});
					this.belongsToMany(Person, {
						as: "Authors",
						foreignKey: "book_id",
						otherKey: "author_id",
						through: "author_relations"
					});
				},

				lookup: function(text = "", page = 0) {
					text = "*" + text.replace(/[^A-z0-9\s]/g, "\\$&") + "*";

					return this.findAll({
						where: [
							"MATCH(book.title, book.subtitle, book.description, book.publisher, book.isbn13) AGAINST (? IN BOOLEAN MODE)",
							[text]
						],
						include: [
							{
								model: models.Person,
								as: "Authors"
							},
							{
								model: models.Image,
								as: "Cover"
							},
							{
								model: models.Offer,
								as: "Offers"
							}
						]
					});
				},

				lookupExternal: function(text = "", page = 0) {
					let amazonBooks = [];

					//combine with external sources
					return amzClient
						.itemSearch({
							keywords: text,
							searchIndex: "Books",
							responseGroup: "ItemAttributes,Offers,Images",
							domain: "webservices.amazon.de"
						})
						.then(results => {
							amazonBooks = results
								.map(result => {
									let attr = result.ItemAttributes[0];

									if (!attr.ISBN || !attr.ISBN[0]) {
										return null;
									}

									return {
										isbn13: attr.ISBN[0].length == 10
											? "978" + attr.ISBN[0]
											: attr.ISBN[0],
										title: attr.Title[0],
										subtitle: attr.Title[1] ? attr.Title[1] : "",
										language: attr.Languages[0].Language.Name,
										description: "",
										publisher: attr.Publisher[0],
										publicationDate: attr.PublicationDate
											? attr.PublicationDate[0]
											: 0,
										pageCount: attr.NumberOfPages ? attr.NumberOfPages[0] : 0,
										verified: false,

										url: result.DetailPageURL[0],
										authors: attr.Author,
										thumbnail: result.LargeImage[0].URL
									};
								})
								.filter(e => e); //removes falsy elements

							return amazonBooks;
						})
						.catch(errors => {
							for (let i = 0; i < errors.length; i++) {
								if (
									errors[i].Error[0].Code[0] ===
									"AWS.ECommerceService.NoExactMatches"
								) {
									return [];
								}
							}

							return errors;
						});
				}
			},
			instanceMethods: {
				setAuthorsRaw: function(authors) {
					return new Promise((resolve, reject) => {
						let authorInstances = [];

						async.each(
							authors,
							(author, callback) => {
								if (isNaN(author)) {
									models.Person
										.searchByExactName(author)
										.then(people => {
											if (people.length === 1) {
												authorInstances.push(people[0]);
												callback();
											} else {
												let parts = author.split(" ");

												if (parts.length === 0 || parts.length > 4) {
													return;
												}

												let authorInstance = models.Person.build();

												switch (parts.length) {
													case 1:
														authorInstance.set({
															nameLast: parts[0]
														});
														break;
													case 2:
														authorInstance.set({
															nameFirst: parts[0],
															nameLast: parts[1]
														});
														break;
													case 3:
														authorInstance.set({
															nameFirst: parts[0],
															nameMiddle: parts[1],
															nameLast: parts[2]
														});
														break;

													case 4:
													default:
														authorInstance.set({
															nameTitle: parts[0],
															nameFirst: parts[1],
															nameMiddle: parts[2],
															nameLast: parts[3]
														});
														break;
												}

												authorInstance.set("verified", false);

												authorInstance
													.save()
													.then(() => {
														authorInstances.push(authorInstance);
														callback();
													})
													.catch(err => {
														callback(err);
													});
											}
										})
										.catch(err => {
											callback(err);
										});
								} else {
									this.Person
										.findOne({ where: { id: author } })
										.then(instance => {
											if (instance) {
												authorInstances.push(instance);
												callback();
											} else {
												callback(new Error("The author couldn't be found!"));
											}
										})
										.catch(err => {
											callback(err);
										});
								}
							},
							err => {
								if (err) {
									return reject(err);
								}

								this.setAuthors(authorInstances)
									.then(() => {
										resolve();
									})
									.catch(err => {
										reject(err);
									});
							}
						);
					});
				},
				toJSON: function(options = {}) {
					let book = this.get(); //invoking virtual getters

					let json = pick(book, [
						"id",
						"isbn13",
						"title",
						"subtitle",
						"language",
						"description",
						"publisher",
						"publicationDate",
						"pageCount",
						"verified",
						"createdAt",
						"updatedAt"
					]);

					if (options.admin) {
						json.coverId = book.cover_image_id;
					}

					json.userId = book.user_id;

					if (book.User) {
						json.user = book.User.toJSON(options);
					}

					if (book.Authors) {
						json.authors = book.Authors.map(author => {
							return author.get("name");
						});
					}

					if (book.Offers) {
						json.offers = book.Offers
							.filter(offer => {
								return !offer.get("sold");
							})
							.map(offer => {
								return offer.toJSON(options);
							});
					}

					json.thumbnails = [];
					if (book.Cover) {
						json.thumbnails = book.Cover.getThumbnailsRaw();
					}

					return json;
				}
			}
		}
	);

	return Book;
};

module.exports = Book;
