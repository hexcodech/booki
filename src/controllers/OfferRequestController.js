class OfferRequestController {
	constructor({ booki, models }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

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
			})
			.catch(next);
	}

	getOfferRequestById(request, response, next) {
		this.models.OfferRequest
			.findOne({
				where: { id: request.params.offerRequestId },
				include: [
					{ model: this.models.User, as: "User" },
					{
						model: this.models.Offer,
						as: "Offer"
					}
				]
			})
			.then(offerRequest => {
				if (!offerRequest) {
					return Promise.reject(new Error("This offer request wasn't found!"));
				}

				if (request.hasPermission("admin.offerRequest.read")) {
					response.json(offerRequest.toJSON({ admin: true }));
				} else {
					response.json(offerRequest.toJSON());
				}
				return response.end();
			})
			.catch(next);
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
			})
			.catch(next);
	}

	postOfferRequest(request, response, next) {
		let offerRequest = this.models.OfferRequest.build(
			this.pick(request.body.offerRequest, ["message"])
		);

		let userId = null,
			email = null;

		if (request.user && request.hasPermission("admin.offerRequest.write")) {
			if (request.body.offerRequest.userId) {
				userId = request.body.offerRequest.userId;
			} else if (request.body.offerRequest.email) {
				email = request.body.offerRequest.email;
			} else {
				userId = request.user.get("id");
			}
		} else if (request.body.offerRequest.email) {
			email = request.body.offerRequest.email;
		} else {
			next(new Error("You have either be to be logged in or send an email!"));
		}

		let promises = [];

		promises.push(
			this.models.Offer
				.findOne({ where: { id: request.body.offerRequest.offerId } })
				.then(offer => {
					if (!offer) {
						return Promise.reject(new Error("The given offer wasn't found!"));
					}

					return Promise.resolve(offer);
				})
		);

		if (userId) {
			promises.push(
				this.models.User.findOne({ where: { id: userId } }).then(user => {
					if (!user) {
						return Promise.reject(new Error("The given user wasn't found!"));
					}

					return Promise.resolve(user);
				})
			);
		}

		Promise.all(promises)
			.then(values => {
				const offer = values[0],
					user = values[1];

				offerRequest.set({
					offer_id: request.body.offerRequest.offerId,
					user_id: userId,
					email: email
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
					});
			})
			.then(offerRequest => {
				if (request.hasPermission("admin.offerRequest.read")) {
					response.json(offerRequest.toJSON({ admin: true }));
				} else {
					response.json(offerRequest.toJSON());
				}
			})
			.catch(next);
	}

	putOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findOne({ where: { id: request.params.offerRequestId } })
			.then(offerRequest => {
				if (!offerRequest) {
					return Promise.reject(new Error("This offer request wasn't found!"));
				}

				if (
					request.hasPermission("admin.offerRequest.editOthers") ||
					offerRequest.get("user_id") === request.user.get("id")
				) {
					let userId = null,
						email = null;

					offerRequest.set(this.pick(request.body.offerRequest, ["message"]));

					if (request.hasPermission("admin.offerRequest.write")) {
						if (request.body.offerRequest.userId) {
							userId = request.body.offerRequest.userId;
						} else if (request.body.offerRequest.email) {
							email = request.body.offerRequest.email;
						} else {
							userId = request.user.get("id");
						}
					} else if (request.body.offerRequest.email) {
						email = request.body.offerRequest.email;
					} else {
						next(
							new Error("You have either be to be logged in or send an email!")
						);
					}

					let promises = [];

					if (userId) {
						promises.push(
							this.models.User.findOne({ where: { id: userId } }).then(user => {
								if (!user) {
									return Promise.reject(
										new Error("The given user wasn't found!")
									);
								}

								return Promise.resolve();
							})
						);
					}

					/*if (request.body.offerRequest.offerId) {
						promises.push(
							this.models.Offer
								.findOne({ where: { id: request.body.offerRequest.offerId } })
								.then(offer => {
									if (!offer) {
									return Promise.reject(
										new Error("The given offer wasn't found!")
									);

									return Promise.resolve();
								})
						);
					}*/

					return Promise.all(promises)
						.then(() => {
							offerRequest.set({
								offer_id: request.body.offerRequest.bookId,
								user_id: userId,
								email: email
							});

							if (request.hasPermission("admin.offerRequest.write")) {
								offerRequest.set(
									this.omitBy(
										this.pick(request.body.offerRequest, ["id", "responded"]),
										this.isNil
									)
								);
							}

							return offerRequest.save();
						})
						.then(offerRequest => {
							if (request.hasPermission("admin.offerRequest.read")) {
								response.json(offerRequest.toJSON({ admin: true }));
							} else {
								response.json(offerRequest.toJSON());
							}
						});
				} else {
					return Promise.reject(
						new Error("You are not allowed to update this offer request!")
					);
				}
			})
			.catch(next);
	}

	deleteOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findOne({ where: { id: request.params.offerRequestId } })
			.then(offerRequest => {
				if (!offerRequest) {
					return Promise.reject(new Error("This offer request wasn't found!"));
				}

				if (
					request.hasPermission("admin.offerRequest.deleteOthers") ||
					offerRequest.get("user_id") === request.user.get("id")
				) {
					return offerRequest.destroy().then(() => {
						response.json({ success: true });
						response.end();
					});
				} else {
					return Promise.reject(
						new Error("You are not allowed to delete this offer request!")
					);
				}
			})
			.catch(next);
	}

	respondToOfferRequest(request, response, next) {
		this.models.OfferRequest
			.findOne({
				where: { id: request.params.offerRequestId },
				include: [{ model: this.models.User, as: "User" }]
			})
			.then(offerRequest => {
				if (!offerRequest) {
					return Promise.reject(new Error("This offer request wasn't found!"));
				}

				if (offerRequest.get("responseKey") == request.query.responseKey) {
					offerRequest.set("responded", true);
					offerRequest.save().then(offerRequest => {
						return response.redirect(
							"mailto:" + offerRequest.get("user_id") &&
								offerRequest.get("User")
								? offerRequest.get("User").get("emailVerified")
								: offerRequest.email
						);
					});
				} else {
					return Promise.reject(new Error("The sent response key is invalid!"));
				}
			})
			.catch(next);
	}
}

module.exports = OfferRequestController;
