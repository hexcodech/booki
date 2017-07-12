class OfferController {
	constructor({ booki, models }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

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
			include = [],
			order = [],
			limit = undefined,
			filter = request.query.filter ? request.query.filter : {};

		if (!request.hasPermission("admin.offer.list")) {
			query.user_id = request.user.id;

			include.push({
				model: this.models.Book,
				as: "Book"
			});
		}

		this.models.Offer
			.findAll({
				where: query,
				include: include,
				order: order,
				limit: limit
			})
			.then(offers => {
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
			})
			.catch(next);
	}

	getOfferById(request, response, next) {
		this.models.Offer
			.findOne({
				where: { id: request.params.offerId },
				include: [
					{
						model: this.models.User,
						as: "User",
						include: [{ model: this.models.Permission, as: "Permissions" }]
					},
					{
						model: this.models.Condition,
						as: "Condition"
					}
				]
			})
			.then(offer => {
				if (!offer) {
					return Promise.reject(new Error("This offer wasn't found!"));
				}

				if (request.hasPermission("admin.offer.read")) {
					response.json(offer.toJSON({ admin: true }));
				} else {
					response.json(offer.toJSON());
				}
				return response.end();
			})
			.catch(next);
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
			})
			.catch(next);
	}

	postOffer(request, response, next) {
		let offer = this.models.Offer.build(
			this.pick(request.body.offer, ["description", "price"])
		);

		let userId =
			request.hasPermission("admin.offer.write") && request.body.offer.userId
				? request.body.offer.userId
				: request.user.get("id");

		let promises = [];

		promises.push(
			this.models.User.findOne({ where: { id: userId } }).then(user => {
				if (!user) {
					return Promise.reject(new Error("The given user wasn't found!"));
				}

				return Promise.resolve();
			})
		);

		promises.push(
			this.models.Book
				.findOne({ where: { id: request.body.offer.bookId } })
				.then(book => {
					if (!book) {
						return Promise.reject(new Error("The given book wasn't found!"));
					}

					return Promise.resolve();
				})
		);

		promises.push(
			this.models.Condition
				.findOne({ where: { id: request.body.offer.conditionId } })
				.then(condition => {
					if (!condition) {
						return Promise.reject(
							new Error("The given condition wasn't found!")
						);
					}

					return Promise.resolve();
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

				return offer.save();
			})
			.then(offer => {
				if (request.hasPermission("admin.offer.read")) {
					response.json(offer.toJSON({ admin: true }));
				} else {
					response.json(offer.toJSON());
				}
			})
			.catch(next);
	}

	putOffer(request, response, next) {
		this.models.Offer
			.findOne({ where: { id: request.params.offerId } })
			.then(offer => {
				if (!offer) {
					return Promise.reject(new Error("This offer wasn't found!"));
				}

				if (
					request.hasPermission("admin.offer.editOthers") ||
					offer.get("user_id") === request.user.get("id")
				) {
					offer.set(
						this.pick(request.body.offer, ["description", "price", "sold"])
					);

					let userId =
						request.hasPermission("admin.offer.write") &&
						request.body.offer.userId
							? request.body.offer.userId
							: request.user.get("id");

					let promises = [];

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

					if (request.body.offer.bookId) {
						promises.push(
							this.models.Book
								.findOne({ where: { id: request.body.offer.bookId } })
								.then(book => {
									if (!book) {
										return Promise.reject(
											new Error("The given Book wasn't found!")
										);
									}

									return Promise.resolve();
								})
						);
					}

					if (request.body.offer.conditionId) {
						promises.push(
							this.models.Condition
								.findOne({ where: { id: request.body.offer.conditionId } })
								.then(condition => {
									if (!condition) {
										return Promise.reject(
											new Error("The given condition wasn't found!")
										);
									}

									return Promise.resolve();
								})
						);
					}

					return Promise.all(promises)
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

							return offer.save();
						})
						.then(offer => {
							if (request.hasPermission("admin.offer.read")) {
								response.json(offer.toJSON({ admin: true }));
							} else {
								response.json(offer.toJSON());
							}
						})
						.catch(next);
				} else {
					return Promise.reject(
						new Error("You are not allowed to update this offer!")
					);
				}
			})
			.catch(next);
	}

	deleteOffer(request, response, next) {
		this.models.Offer
			.findOne({ where: { id: request.params.offerId } })
			.then(offer => {
				if (!offer) {
					return Promise.reject(new Error("This offer wasn't found!"));
				}

				if (
					request.hasPermission("admin.offer.deleteOthers") ||
					offer.get("user_id") === request.user.get("id")
				) {
					offer.destroy().then(() => {
						response.json({ success: true });
						response.end();
					});
				} else {
					return Promise.reject(
						new Error("You are not allowed to delete this offer!")
					);
				}
			})
			.catch(next);
	}
}

module.exports = OfferController;
