class BookController {
	constructor({ booki, config, sequelize, generateRandomString, models }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");
		this.Sequelize = require("sequelize");

		this.config = config;

		this.models = models;

		this.generateRandomString = generateRandomString;

		bindAll(this, [
			"getBook",
			"getBookById",
			"postBook",
			"putBook",
			"deleteBook",
			"lookupBook",
			"lookupExternalBook"
		]);
	}

	getBook(request, response, next) {
		let query = {},
			filter = request.query.filter ? request.query.filter : {};

		//seqelize can't do include, limit and orderby association at the same time

		if ("latestOffers" in filter && filter.latestOffers) {
			this.models.Offer
				.findAll({
					limit: this.config.LATEST_OFFERS_LIMIT,
					attributes: [
						"book_id",
						[
							this.Sequelize.fn("MAX", this.Sequelize.col("createdAt")),
							"createdAt"
						]
					],
					order: [this.Sequelize.fn("MAX", this.Sequelize.col("createdAt"))],
					group: ["book_id"]
				})
				.then(offers => {
					let bookIds = offers.map(offer => {
						return offer.get("book_id");
					});

					return this.models.Book
						.findAll({
							include: [{ model: this.models.Image, as: "Cover" }],
							where: { id: { in: bookIds } }
						})
						.then(books => {
							if (request.hasPermission("admin.book.read")) {
								response.json(
									books.map(book => {
										return book.toJSON({ admin: true });
									})
								);
							} else {
								response.json(
									books.map(book => {
										return book.toJSON();
									})
								);
							}
							return response.end();
						});
				})
				.catch(next);
		} else if (!request.user || !request.hasPermission("admin.book.list")) {
			console.log(request.user, !request.hasPermission("admin.book.list"));

			next(new Error("You are not allowed to list all books!"));
		} else {
			this.models.Book
				.findAll()
				.then(books => {
					if (request.hasPermission("admin.book.read")) {
						response.json(
							books.map(book => {
								return book.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							books.map(book => {
								return book.toJSON();
							})
						);
					}
					return response.end();
				})
				.catch(next);
		}
	}

	getBookById(request, response, next) {
		this.models.Book
			.findOne({
				where: { id: request.params.bookId },
				include: [
					{
						model: this.models.Person,
						as: "Authors"
					},
					{
						model: this.models.Image,
						as: "Cover"
					},
					{
						model: this.models.Offer,
						as: "Offers",
						include: [
							{
								model: this.models.User,
								as: "User",
								include: [{ model: this.models.Image, as: "ProfilePicture" }]
							},
							{
								model: this.models.Condition,
								as: "Condition"
							}
						]
					}
				]
			})
			.then(book => {
				if (!book) {
					return Promise.reject(new Error("This book wasn't found!"));
				}

				if (request.hasPermission("admin.book.read")) {
					response.json(book.toJSON({ admin: true }));
				} else {
					response.json(book.toJSON());
				}

				return response.end();
			})
			.catch(next);
	}

	postBook(request, response, next) {
		this.models.Book
			.create(
				this.pick(request.body.book, [
					"isbn13",
					"title",
					"subtitle",
					"language",
					"description",
					"publisher",
					"publicationDate",
					"pageCount"
				])
			)
			.then(book => {
				//check whether the cover actually exists
				return this.models.Image
					.findOne({ where: { id: request.body.book.coverId } })
					.then(image => {
						let promises = [];

						if (image) {
							book.set("cover_image_id", request.body.book.coverId);
						}

						//add additional fields
						if (
							request.hasPermissions(["admin.book.create", "admin.book.write"])
						) {
							book.set(this.pick(request.body.book, ["id", "verified"]));

							if (request.body.book.userId) {
								book.set("user_id", request.body.book.userId);
							} else {
								book.set("user_id", request.user.get("id"));
							}
						} else {
							book.set("user_id", request.user.get("id"));
						}

						promises.push(book.save());

						promises.push(book.setAuthorsRaw(request.body.book.authors));

						return Promise.all(promises).then(() => {
							return book
								.reload({
									include: [
										{
											model: this.models.Person,
											as: "Authors"
										},
										{
											model: this.models.Image,
											as: "Cover"
										}
									]
								})
								.then(() => {
									if (request.hasPermission("admin.book.read")) {
										response.json(book.toJSON({ admin: true }));
									} else {
										response.json(book.toJSON({ owner: true }));
									}
								});
						});
					});
			})
			.catch(next);
	}

	putBook(request, response, next) {
		this.models.Book
			.findOne({ where: { id: request.params.bookId } })
			.then(book => {
				if (!book) {
					return Promise.reject(new Error("This book wasn't found!"));
				}

				//if the book isn't verified yet, everyone can edit it
				if (
					book.get("verified") &&
					!request.hasPermission("admin.book.editOthers")
				) {
					return Promise.reject(
						new Error("You're not allowed to edit this book!")
					);
				}

				return this.models.Image
					.findOne({
						where: { id: request.body.book.coverId }
					})
					.then(image => {
						let promises = [];

						if (image) {
							book.set("cover_image_id", request.body.book.coverId);
						}

						book.set(
							this.omitBy(
								this.pick(request.body.book, [
									"title",
									"subtitle",
									"language",
									"description",
									"publisher",
									"publicationDate",
									"pageCount"
								]),
								this.isNil
							)
						);

						//set the userId to the last user who edited it
						book.set("user_id", request.user.id);

						if (request.hasPermission("admin.book.write")) {
							book.set(
								this.omitBy(
									this.pick(request.body.book, ["verified"]),
									this.isNil
								)
							);

							if (request.body.book.userId) {
								book.set("user", request.body.book.userId);
							}
						}

						promises.push(book.save());

						return Promise.all(promises).then(() => {
							if (request.hasPermission("admin.book.read")) {
								response.json(book.toJSON({ admin: true }));
							} else {
								response.json(book.toJSON());
							}

							return response.end();
						});
					});
			})
			.catch(next);
	}

	deleteBook(request, response, next) {
		this.models.Book
			.findOne({
				where: { id: request.params.bookId },
				include: [
					{
						model: this.models.User,
						as: "User"
					},
					{
						model: this.models.Image,
						as: "CoverImage"
					}
				]
			})
			.then(book => {
				if (!book) {
					return Promise.reject(new Error("This book wasn't found!"));
				}
				//only admins can delete books
				if (!request.hasPermission("admin.book.deleteOthers")) {
					return Promise.reject(new Error("You are not allowed to do this!"));
				}

				book
					.destroy()
					.then(() => {
						response.json({ success: true });
						return response.end();
					})
					.catch(next);
			})
			.catch(next);
	}

	lookupBook(request, response, next) {
		this.models.Book
			.lookup(request.query.search)
			.then(books => {
				if (request.hasPermission("admin.book.read")) {
					response.json(
						books.map(book => {
							return book.toJSON({ admin: true });
						})
					);
				} else {
					response.json(
						books.map(book => {
							return book.toJSON();
						})
					);
				}

				return response.end();
			})
			.catch(next);
	}

	lookupExternalBook(request, response, next) {
		this.models.Book
			.lookupExternal(request.query.search)
			.then(books => {
				response.json(books);
				return response.end();
			})
			.catch(next);
	}
}

module.exports = BookController;
