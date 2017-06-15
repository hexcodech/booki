class OfferController {
	constructor({ booki, models, errorController }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.errorController = errorController;

		this.models = models;

		bindAll(this, [
			"getOffer",
			"getOfferById",
			"getOfferByBookId",
			"postOffer",
			"putOffer",
			"deleteOffer"
		]);
	}

	getOffer(request, response, next) {
		let query = {},
			include = [];
		let filter = request.query.filter ? request.query.filter : {};

		if ("latest" in filter && filter.latest) {
			//TODO move limit to config
			Object.assign(query, { order: [["created_at", "DESC"]], limit: 6 });

			include.push({
				model: this.models.Book,
				as: "Book",
				include: [{ model: this.models.Image, as: "Cover" }]
			});
		} else if (!request.hasPermission("admin.offer.list")) {
			query.user_id = request.user.id;

			include.push({
				model: this.models.Book,
				as: "Book"
			});
		}

		this.models.Offer
			.findAll({
				where: query,
				include: include
			})
			.then(offers => {
				if (offers) {
					if (request.hasPermission("admin.offer.read")) {
						response.json(
							offers.map(offer => {
								return offer.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							offers.map(offer => {
								return offer.toJSON();
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
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	getOfferById(request, response, next) {
		this.models.Offer
			.findOne({
				where: { id: request.params.offerId },
				include: [
					{
						model: this.models.User,
						as: "User"
					},
					{
						model: this.models.Condition,
						as: "Condition"
					}
				]
			})
			.then(offer => {
				if (offer) {
					if (request.hasPermission("admin.offer.read")) {
						response.json(offer.toJSON({ admin: true }));
					} else {
						response.json(offer.toJSON());
					}
					return response.end();
				}

				return next(
					new this.errorController.errors.UnexpectedQueryResultError()
				);
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	getOfferByBookId(request, response, next) {
		this.models.Offer
			.findAll({
				where: { book_id: request.params.bookId },
				include: [
					{
						model: this.models.User,
						as: "User"
					},
					{
						model: this.models.Condition,
						as: "Condition"
					}
				]
			})
			.then(offers => {
				if (offers) {
					if (request.hasPermission("admin.offer.read")) {
						response.json(
							offers.map(offer => {
								return offer.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							offers.map(offer => {
								return offer.toJSON();
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
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	postOffer(request, response, next) {
		let offer = this.models.Offer.build(
			this.pick(request.body.offer, ["description", "price"])
		);

		let userId = request.hasPermission("admin.offer.write") &&
			request.body.offer.userId
			? request.body.offer.userId
			: request.user.get("id");

		let promises = [];

		promises.push(
			this.models.User.findOne({ where: { id: userId } }).then(user => {
				if (user) {
					return Promise.resolve();
				} else {
					return Promise.reject(
						new this.errorController.errors.NotFoundError()
					);
				}
			})
		);

		promises.push(
			this.models.Book
				.findOne({ where: { id: request.body.offer.bookId } })
				.then(book => {
					if (book) {
						return Promise.resolve();
					} else {
						return Promise.reject(
							new this.errorController.errors.NotFoundError()
						);
					}
				})
		);

		promises.push(
			this.models.Condition
				.findOne({ where: { id: request.body.offer.conditionId } })
				.then(condition => {
					if (condition) {
						return Promise.resolve();
					} else {
						return Promise.reject(
							new this.errorController.errors.NotFoundError()
						);
					}
				})
		);

		Promise.all(promises)
			.then(() => {
				offer.set({
					book_id: request.body.offer.bookId,
					user_id: userId,
					condition_id: request.body.offer.conditionId
				});

				if (request.hasPermission("admin.offer.write")) {
					offer.set(
						this.omitBy(this.pick(request.body.offer, ["id"]), this.isNil)
					);
				}

				return offer.save().catch(err => {
					return Promise.reject(
						new this.errorController.errors.DatabaseError({
							message: err.message
						})
					);
				});
			})
			.then(offer => {
				if (request.hasPermission("admin.offer.read")) {
					response.json(offer.toJSON({ admin: true }));
				} else {
					response.json(offer.toJSON());
				}
			})
			.catch(error => {
				return next(error);
			});
	}

	putOffer(request, response, next) {
		this.models.Offer
			.findOne({ where: { id: request.params.offerId } })
			.then(offer => {
				if (offer) {
					if (
						request.hasPermission("admin.offer.editOthers") ||
						offer.get("user_id") === request.user.get("id")
					) {
						offer.set(
							this.pick(request.body.offer, ["description", "price", "sold"])
						);

						let userId = request.hasPermission("admin.offer.write") &&
							request.body.offer.userId
							? request.body.offer.userId
							: request.user.get("id");

						let promises = [];

						promises.push(
							this.models.User.findOne({ where: { id: userId } }).then(user => {
								if (user) {
									return Promise.resolve();
								} else {
									return Promise.reject(
										new this.errorController.errors.NotFoundError()
									);
								}
							})
						);

						if (request.body.offer.bookId) {
							promises.push(
								this.models.Book
									.findOne({ where: { id: request.body.offer.bookId } })
									.then(book => {
										if (book) {
											return Promise.resolve();
										} else {
											return Promise.reject(
												new this.errorController.errors.NotFoundError()
											);
										}
									})
							);
						}

						if (request.body.offer.conditionId) {
							promises.push(
								this.models.Condition
									.findOne({ where: { id: request.body.offer.conditionId } })
									.then(condition => {
										if (condition) {
											return Promise.resolve();
										} else {
											return Promise.reject(
												new this.errorController.errors.NotFoundError()
											);
										}
									})
							);
						}

						Promise.all(promises)
							.then(() => {
								offer.set({
									book_id: request.body.offer.bookId,
									user_id: userId,
									condition_id: request.body.offer.conditionId
								});

								if (request.hasPermission("admin.offer.write")) {
									offer.set(
										this.omitBy(
											this.pick(request.body.offer, ["id"]),
											this.isNil
										)
									);
								}

								return offer.save().catch(err => {
									return Promise.reject(
										new this.errorController.errors.DatabaseError({
											message: err.message
										})
									);
								});
							})
							.then(offer => {
								if (request.hasPermission("admin.offer.read")) {
									response.json(offer.toJSON({ admin: true }));
								} else {
									response.json(offer.toJSON());
								}
							})
							.catch(error => {
								return next(error);
							});
					} else {
						return next(new this.errorController.errors.ForbiddenError());
					}
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

	deleteOffer(request, response, next) {
		this.models.Offer
			.findOne({ where: { id: request.params.offerId } })
			.then(offer => {
				if (offer) {
					if (
						request.hasPermission("admin.offer.deleteOthers") ||
						offer.get("user_id") === request.user.get("id")
					) {
						offer
							.destroy()
							.then(() => {
								response.json({ success: true });
								response.end();
							})
							.catch(err => {
								return next(
									new this.errorController.errors.DatabaseError({
										message: err.message
									})
								);
							});
					} else {
						return next(new this.errorController.errors.ForbiddenError());
					}
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
}

module.exports = OfferController;
