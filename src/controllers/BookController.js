class BookController {
	constructor({
		booki,
		config,
		sequelize,
		errorController,
		generateRandomString,
		models
	}) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.config = config;
		this.errorController = errorController;

		this.Book = models.Book;
		this.Image = models.Image;
		this.User = models.User;
		this.Person = models.Person;

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
		this.Book
			.findAll()
			.then(books => {
				if (books) {
					if (request.hasPermission("admin.book.hiddenData.read")) {
						response.json(
							books.map(book => {
								return book.toJSON({ hiddenData: true });
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
				}

				return next(
					new this.errorController.errors.UnexpectedQueryResultError()
				);
			})
			.catch(err => {
				console.log(err);
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	getBookById(request, response, next) {
		this.Book
			.findOne({ where: { id: request.params.bookId } })
			.then(book => {
				if (book) {
					if (request.hasPermission("admin.book.hiddenData.read")) {
						response.json(book.toJSON({ hiddenData: true }));
					} else {
						response.json(book.toJSON());
					}

					return response.end();
				} else {
					next(new this.errorController.errors.NotFoundError());
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	postBook(request, response, next) {
		this.Book
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
				this.Image
					.findOne({ where: { id: request.body.book.coverId } })
					.then(image => {
						let promises = [];

						if (image) {
							book.set("cover_image_id", request.body.book.coverId);
						}

						//add additional fields
						if (
							request.hasPermissions([
								"admin.book.create",
								"admin.book.hiddenData.write"
							])
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

						Promise.all(promises)
							.then(() => {
								book
									.reload()
									.then(() => {
										if (request.hasPermission("admin.book.hiddenData.read")) {
											response.json(book.toJSON({ hiddenData: true }));
										} else {
											response.json(book.toJSON());
										}
									})
									.catch(err => {
										return next(
											new this.errorController.errors.DatabaseError({
												message: err.message
											})
										);
									});
							})
							.catch(err => {
								return next(
									new this.errorController.errors.DatabaseError({
										message: err.message
									})
								);
							});
					})
					.catch(err => {
						return next(
							new this.errorController.errors.DatabaseError({
								message: err.message
							})
						);
					});
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	putBook(request, response, next) {
		this.Book
			.findOne({ where: { id: request.params.bookId } })
			.then(book => {
				if (book) {
					//if the book isn't verified yet, everyone can edit it
					if (
						!book.get("verified") ||
						!request.hasPermission("admin.book.editOthers")
					) {
						return next(new this.errorController.errors.ForbiddenError());
					}

					this.Image
						.findOne({ where: { id: request.body.book.coverId } })
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

							//if a user updated
							book.set("user_id", request.user.id);

							if (request.hasPermission("admin.book.hiddenData.write")) {
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

							Promise.all(promises)
								.then(() => {
									if (request.hasPermission("admin.book.hiddenData.read")) {
										response.json(book.toJSON({ hiddenData: true }));
									} else {
										response.json(book.toJSON());
									}

									return response.end();
								})
								.catch(err => {
									console.log(err);
									return next(
										new this.errorController.errors.DatabaseError({
											message: err.message
										})
									);
								});
						})
						.catch(err => {
							return next(
								new this.errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});
				} else {
					return next(new this.errorController.errors.NotFoundError());
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	deleteBook(request, response, next) {
		this.Book
			.findOne({
				where: { id: request.params.bookId },
				include: [
					{
						model: this.User,
						as: "User"
					},
					{
						model: this.Image,
						as: "CoverImage"
					}
				]
			})
			.then(book => {
				if (!book) {
					return next(new this.errorController.errors.NotFoundError());
				}
				//only admins can delete books
				if (!request.hasPermission("admin.book.deleteOthers")) {
					return next(new this.errorController.errors.ForbiddenError());
				}

				book
					.destroy()
					.then(() => {
						response.json({ success: true });
						return response.end();
					})
					.catch(err => {
						return next(
							new this.errorController.errors.DatabaseError({
								message: err.message
							})
						);
					});
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	lookupBook(request, response, next) {
		this.Book
			.lookup(request.query.search)
			.then(books => {
				if (request.hasPermission("admin.book.hiddenData.read")) {
					response.json(
						books.map(book => {
							return book.toJSON({ hiddenData: true });
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
			.catch(error => {
				return next(error);
			});
	}

	lookupExternalBook(request, response, next) {
		this.Book
			.lookupExternal(request.query.search)
			.then(books => {
				response.json(books);
				return response.end();
			})
			.catch(error => {
				return next(error);
			});
	}
}

module.exports = BookController;
