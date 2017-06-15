class OfferRequestController {
	constructor({ booki, models, errorController }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.errorController = errorController;

		this.models = models;

		bindAll(this, [
			"getOfferRequest",
			"getOfferRequestById",
			"postOfferRequest",
			"getUserOfferRequests",
			"putOfferRequest",
			"deleteOfferRequest",
			"respondToOfferRequest"
		]);
	}

	getOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findAll()
			.then(offerRequests => {
				if (offerRequests) {
					if (request.hasPermission("admin.offerRequest.read")) {
						response.json(
							offerRequests.map(offerRequest => {
								return offerRequest.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							offerRequests.map(offerRequest => {
								return offerRequest.toJSON();
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

	getOfferRequestById(request, response, next) {
		this.models.OfferRequest
			.findOne({ where: { id: request.params.offerRequestId } })
			.then(offerRequest => {
				if (offerRequest) {
					if (request.hasPermission("admin.offerRequest.read")) {
						response.json(offerRequest.toJSON({ admin: true }));
					} else {
						response.json(offerRequest.toJSON());
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

	getUserOfferRequests(request, response, next) {
		this.models.OfferRequest
			.findAll({
				where: { user_id: request.user.get("id") },
				include: [
					{
						model: this.models.Offer,
						as: "Offer"
					}
				]
			})
			.then(offerRequests => {
				if (offerRequests) {
					if (request.hasPermission("admin.offerRequest.read")) {
						response.json(
							offerRequests.map(offerRequest => {
								return offerRequest.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							offerRequests.map(offerRequest => {
								return offerRequest.toJSON();
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

	postOfferRequest(request, response, next) {
		let offerRequest = this.models.OfferRequest.build(
			this.pick(request.body.offerRequest, ["message"])
		);

		let userId = request.hasPermission("admin.offerRequest.write") &&
			request.body.offerRequest.userId
			? request.body.offerRequest.userId
			: request.user.get("id");

		let promises = [];

		promises.push(
			this.models.Offer
				.findOne({ where: { id: request.body.offerRequest.offerId } })
				.then(offer => {
					if (offer) {
						return Promise.resolve(offer);
					} else {
						return Promise.reject(
							new this.errorController.errors.NotFoundError()
						);
					}
				})
		);

		promises.push(
			this.models.User.findOne({ where: { id: userId } }).then(user => {
				if (user) {
					return Promise.resolve(user);
				} else {
					return Promise.reject(
						new this.errorController.errors.NotFoundError()
					);
				}
			})
		);

		Promise.all(promises)
			.then(values => {
				const offer = values[0],
					user = values[1];

				offerRequest.set({
					offer_id: request.body.offerRequest.offerId,
					user_id: userId
				});

				if (request.hasPermission("admin.offerRequest.write")) {
					offerRequest.set(
						this.omitBy(
							this.pick(request.body.offerRequest, ["id", "responded"]),
							this.isNil
						)
					);
				}

				offerRequest.set(
					"responseKey",
					this.models.OfferRequest.generateResponseKey()
				);

				return offerRequest
					.save()
					.then(offerRequest => {
						return offerRequest.reload();
					})
					.then(offerRequest => {
						return offerRequest.sendMail().then(() => {
							return Promise.resolve(offerRequest);
						});
					})
					.then(() => {
						//if everything worked, mark offer as sold
						offer.set("sold", true);
						return offer.save();
					})
					.catch(err => {
						return Promise.reject(
							new this.errorController.errors.DatabaseError({
								message: err.message
							})
						);
					});
			})
			.then(offerRequest => {
				if (request.hasPermission("admin.offerRequest.read")) {
					response.json(offerRequest.toJSON({ admin: true }));
				} else {
					response.json(offerRequest.toJSON());
				}
			})
			.catch(error => {
				return next(error);
			});
	}

	putOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findOne({ where: { id: request.params.offerRequestId } })
			.then(offerRequest => {
				if (offerRequest) {
					if (
						request.hasPermission("admin.offerRequest.editOthers") ||
						offerRequest.get("user_id") === request.user.get("id")
					) {
						offerRequest.set(this.pick(request.body.offerRequest, ["message"]));

						let userId = request.hasPermission("admin.offerRequest.write") &&
							request.body.offerRequest.userId
							? request.body.offerRequest.userId
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

						if (request.body.offerRequest.offerId) {
							promises.push(
								this.models.Offer
									.findOne({ where: { id: request.body.offerRequest.offerId } })
									.then(offer => {
										if (offer) {
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
								offerRequest.set({
									offer_id: request.body.offerRequest.bookId,
									user_id: userId
								});

								if (request.hasPermission("admin.offerRequest.write")) {
									offerRequest.set(
										this.omitBy(
											this.pick(request.body.offerRequest, ["id", "responded"]),
											this.isNil
										)
									);
								}

								return offerRequest.save().catch(err => {
									return Promise.reject(
										new this.errorController.errors.DatabaseError({
											message: err.message
										})
									);
								});
							})
							.then(offerRequest => {
								if (request.hasPermission("admin.offerRequest.read")) {
									response.json(offerRequest.toJSON({ admin: true }));
								} else {
									response.json(offerRequest.toJSON());
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

	deleteOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findOne({ where: { id: request.params.offerRequestId } })
			.then(offerRequest => {
				if (offerRequest) {
					if (
						request.hasPermission("admin.offerRequest.deleteOthers") ||
						offerRequest.get("user_id") === request.user.get("id")
					) {
						offerRequest
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

	respondToOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findOne({ where: { id: request.params.offerRequestId } })
			.then(offerRequest => {
				if (offerRequest) {
					if (offerRequest.get("responseKey") == request.query.responseKey) {
						offerRequest.set("responded", true);
						offerRequest
							.save()
							.then(offerRequest => {
								return response.redirect(
									"mailto:" + offerRequest.get("User").get("emailVerified")
								);
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

module.exports = OfferRequestController;
