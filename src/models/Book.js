const Book = ({ config, sequelize, models }) => {
	const get = require("lodash/get");
	const pick = require("lodash/pick");

	const Sequelize = require("sequelize");
	const request = require("request-promise-native");
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
				unique: true,
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
			},

			amazonUrl: {
				type: Sequelize.STRING(512)
			}
		},
		{
			charset: "utf8",
			collate: "utf8_unicode_ci",
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
			}
		}
	);

	Book.associate = function({ User, Image, Person, Offer }) {
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
	};

	Book.lookup = function(text = "", page = 0) {
		return sequelize
			.query(
				"SELECT * FROM books WHERE MATCH(books.title, books.subtitle, books.description, books.publisher, books.isbn13) AGAINST ($text IN BOOLEAN MODE)",
				{
					bind: { text: "*" + text.replace(/[^\wÀ-ž\s]/g, " ") + "*" },
					type: sequelize.QueryTypes.SELECT,
					model: this
				}
			)
			.then(books => {
				let ids = books.map(book => {
					return book.get("id");
				});

				return this.findAll({
					where: { id: { $in: ids } },
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
							as: "Offers",
							include: [
								{
									model: models.User,
									as: "User",
									include: [
										{
											model: models.Image,
											as: "ProfilePicture",
											include: [{ model: models.Thumbnail, as: "Thumbnails" }]
										}
									]
								}
							]
						}
					]
				});
			});
	};

	Book.lookupExternal = function(text = "", user = null) {
		return amzClient
			.itemSearch({
				keywords: text,
				searchIndex: "Books",
				responseGroup: "ItemAttributes,Offers,Images",
				domain: "webservices.amazon.de"
			})
			.then(results => {
				return new Promise((resolve, reject) => {
					async.map(
						results,
						(result, callback) => {
							let attr = result.ItemAttributes[0];

							if (!attr.ISBN || !attr.ISBN[0]) {
								return callback(null, false);
							}

							let isbn13 =
								attr.ISBN[0].length == 10
									? Book.isbn10ToIsbn13(attr.ISBN[0])
									: attr.ISBN[0];

							//check if already in db
							this.findOne({ where: { isbn13: isbn13 } })
								.then(book => {
									if (book) {
										//return book in db
										callback(null, book);
									} else {
										//save to db
										let book = this.build({
											isbn13: isbn13,
											title: attr.Title && attr.Title[0] ? attr.Title[0] : "",
											subtitle:
												attr.Title && attr.Title[1] ? attr.Title[1] : "",
											/*language:
											attr.Languages &&
											attr.Languages[0] &&
											attr.Languages[0].Language &&
											attr.Languages[0].Language.Name
												? attr.Languages[0].Language.Name
												: "",*/
											description: "",
											publisher:
												attr.Publisher && attr.Publisher[0]
													? attr.Publisher[0]
													: "",
											publicationDate: attr.PublicationDate
												? attr.PublicationDate[0]
												: 0,
											pageCount: attr.NumberOfPages ? attr.NumberOfPages[0] : 0,
											verified: false,
											amazonUrl:
												result.DetailPageURL && result.DetailPageURL[0]
													? result.DetailPageURL[0]
													: ""
										});

										let url = "",
											size = 0,
											maxSize = 0;

										for (let i = 0; i < result.ImageSets.length; i++) {
											for (let key in result.ImageSets[i].ImageSet[0]) {
												if (
													!result.ImageSets[i].ImageSet[0].hasOwnProperty(
														key
													) ||
													!key.includes("Image")
												) {
													continue;
												}

												for (
													let j = 0;
													j < result.ImageSets[i].ImageSet[0][key].length;
													j++
												) {
													for (
														let k = 0;
														k <
														result.ImageSets[i].ImageSet[0][key][j].Width
															.length;
														k++
													) {
														if (
															result.ImageSets[i].ImageSet[0][key][j].Width[k][
																"$"
															].Units !== "pixels"
														) {
															continue;
														}
														size =
															parseInt(
																result.ImageSets[i].ImageSet[0][key][j].Width[
																	k
																]["_"]
															) *
															parseInt(
																result.ImageSets[i].ImageSet[0][key][j].Height[
																	k
																]["_"]
															);

														if (size > maxSize) {
															maxSize = size;
															url =
																result.ImageSets[i].ImageSet[0][key][j].URL[k];
														}
													}
												}
											}
										}

										book
											.save()
											.then(() => {
												return book.setAuthorsRaw(attr.Author);
											})
											.then(() => {
												return request({ uri: url, encoding: null });
											})
											.then(buffer => {
												return models.Image.store(buffer, user);
											})
											.then(image => {
												return book.setCover(image);
											})
											.then(() => {
												return book.reload({
													include: [
														{ model: models.Image, as: "Cover" },
														{ model: models.Person, as: "Authors" }
													]
												});
											})
											.then(() => {
												callback(null, book);
											})
											.catch(callback);
									}
								})
								.catch(callback);
						},
						(err, books) => {
							if (err) {
								return reject(err);
							}

							return resolve(books.filter(el => el));
						}
					);
				});
			})
			.catch(errors => {
				if (Array.isArray(errors)) {
					for (let i = 0; i < errors.length; i++) {
						if (
							errors[i].Error[0].Code[0] ===
							"AWS.ECommerceService.NoExactMatches"
						) {
							return [];
						}
					}

					return Promise.reject(errors);
				} else {
					return Promise.reject(errors);
				}
			});
	};

	Book.isbn10ToIsbn13 = function(isbn10) {
		let isbn9 = "978" + isbn10.toString().slice(0, -1),
			checkDigit = 0; //remove check digit and calculate the new one

		for (let i = 0; i < isbn9.length; i++) {
			checkDigit += parseInt(isbn9.charAt(i)) * ((i - 1) % 2 === 0 ? 3 : 1);
		}

		checkDigit = ((10 - parseInt(checkDigit.toString()) % 10) % 10).toString();

		return isbn9 + checkDigit;
	};

	Book.prototype.setAuthorsRaw = function(authors) {
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
								if (!instance) {
									return Promise.reject(
										new Error("The author couldn't be found!")
									);
								}

								authorInstances.push(instance);
								callback();
							})
							.catch(callback);
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
	};

	Book.prototype.toJSON = function(options = {}) {
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
	};

	return Book;
};

module.exports = Book;
