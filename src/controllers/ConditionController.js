class ConditionController {
	constructor({ booki, models, errorController }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.errorController = errorController;

		this.models = models;

		bindAll(this, [
			"getCondition",
			"getConditionById",
			"postCondition",
			"putCondition",
			"deleteCondition"
		]);
	}

	getCondition(request, response, next) {
		this.models.Condition
			.findAll()
			.then(conditions => {
				if (conditions) {
					if (request.hasPermission("admin.condition.read")) {
						response.json(
							conditions.map(condition => {
								return condition.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							conditions.map(condition => {
								return condition.toJSON();
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

	getConditionById(request, response, next) {
		this.models.Condition
			.findOne({ where: { id: request.params.conditionId } })
			.then(condition => {
				if (condition) {
					if (request.hasPermission("admin.condition.read")) {
						response.json(condition.toJSON({ admin: true }));
					} else {
						response.json(condition.toJSON());
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

	postCondition(request, response, next) {
		let condition = this.models.Condition.build(
			this.pick(request.body.condition, ["key", "priceFactor"])
		);

		if (request.hasPermission("admin.condition.write")) {
			condition.set(
				this.omitBy(this.pick(request.body.condition, ["id"]), this.isNil)
			);
		}

		condition
			.save()
			.then(() => {
				if (request.hasPermission("admin.condition.read")) {
					response.json(condition.toJSON({ admin: true }));
				} else {
					response.json(condition.toJSON());
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

	putCondition(request, response, next) {
		this.models.Condition
			.findOne({ where: { id: request.params.conditionId } })
			.then(condition => {
				if (condition) {
					condition.set(
						this.pick(request.body.condition, ["key", "priceFactor"])
					);

					if (request.hasPermission("admin.condition.write")) {
						condition.set(
							this.omitBy(this.pick(request.body.condition, ["id"]), this.isNil)
						);
					}

					condition
						.save()
						.then(() => {
							if (request.hasPermission("admin.condition.read")) {
								response.json(condition.toJSON({ admin: true }));
							} else {
								response.json(condition.toJSON());
							}
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

	deleteCondition(request, response, next) {
		this.models.Condition
			.findOne({ where: { id: request.params.conditionId } })
			.then(condition => {
				if (condition) {
					condition
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

module.exports = ConditionController;
