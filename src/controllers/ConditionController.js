class ConditionController {
	constructor({ booki, models }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

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
			})
			.catch(next);
	}

	getConditionById(request, response, next) {
		this.models.Condition
			.findOne({ where: { id: request.params.conditionId } })
			.then(condition => {
				if (!condition) {
					return Promise.reject(new Error("This condition wasn't found!"));
				}

				if (request.hasPermission("admin.condition.read")) {
					response.json(condition.toJSON({ admin: true }));
				} else {
					response.json(condition.toJSON());
				}
				return response.end();
			})
			.catch(next);
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
			.catch(next);
	}

	putCondition(request, response, next) {
		this.models.Condition
			.findOne({ where: { id: request.params.conditionId } })
			.then(condition => {
				if (!condition) {
					return Promise.reject(new Error("This condition wasn't found!"));
				}
				condition.set(
					this.pick(request.body.condition, ["key", "priceFactor"])
				);

				if (request.hasPermission("admin.condition.write")) {
					condition.set(
						this.omitBy(this.pick(request.body.condition, ["id"]), this.isNil)
					);
				}

				return condition.save().then(() => {
					if (request.hasPermission("admin.condition.read")) {
						response.json(condition.toJSON({ admin: true }));
					} else {
						response.json(condition.toJSON());
					}
				});
			})
			.catch(next);
	}

	deleteCondition(request, response, next) {
		this.models.Condition
			.findOne({ where: { id: request.params.conditionId } })
			.then(condition => {
				if (!condition) {
					return Promise.reject(new Error("This condition wasn't found!"));
				}

				return condition.destroy().then(() => {
					response.json({ success: true });
					response.end();
				});
			})
			.catch(next);
	}
}

module.exports = ConditionController;
