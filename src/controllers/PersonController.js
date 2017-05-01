class PersonController {
	constructor({ booki, models, errorController }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.errorController = errorController;

		this.Person = models.Person;

		bindAll(this, [
			"getPerson",
			"getPersonById",
			"postPerson",
			"putPerson",
			"deletePerson",
			"lookupPerson"
		]);
	}

	getPerson(request, response, next) {
		this.Person
			.findAll()
			.then(people => {
				if (people) {
					if (request.hasPermission("admin.person.hiddenData.read")) {
						response.json(
							people.map(person => {
								return person.toJSON({ hiddenData: true });
							})
						);
					} else {
						response.json(
							people.map(person => {
								return person.toJSON();
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

	getPersonById(request, response, next) {
		this.Person
			.findById(request.params.personId)
			.then(person => {
				if (person) {
					if (request.hasPermission("admin.person.hiddenData.read")) {
						response.json(person.toJSON({ hiddenData: true }));
					} else {
						response.json(person.toJSON());
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

	postPerson(request, response, next) {
		let person = this.Person.build(
			this.pick(request.body.person, [
				"nameTitle",
				"nameFirst",
				"nameMiddle",
				"nameLast"
			])
		);

		if (request.hasPermission("admin.person.hiddenData.write")) {
			person.set(
				this.omitBy(
					this.pick(request.body.person, ["id", "verified"]),
					this.isNil
				)
			);
		}

		person
			.save()
			.then(() => {
				if (request.hasPermission("admin.person.hiddenData.read")) {
					response.json(person.toJSON({ hiddenData: true }));
				} else {
					response.json(person.toJSON());
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

	putPerson(request, response, next) {
		this.Person
			.findById(request.params.personId)
			.then(person => {
				if (person) {
					person.set(
						this.pick(request.body.person, [
							"nameTitle",
							"nameFirst",
							"nameMiddle",
							"nameLast"
						])
					);

					if (request.hasPermission("admin.person.hiddenData.write")) {
						person.set(
							this.omitBy(
								this.pick(request.body.person, ["id", "verified"]),
								this.isNil
							)
						);
					}

					person
						.save()
						.then(() => {
							if (request.hasPermission("admin.person.hiddenData.read")) {
								response.json(person.toJSON({ hiddenData: true }));
							} else {
								response.json(person.toJSON());
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

	deletePerson(request, response, next) {
		this.Person
			.findById(request.params.personId)
			.then(person => {
				if (person) {
					person
						.destroy()
						.then(() => {
							reponse.end("{success: true}");
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

	lookupPerson(request, response, next) {
		this.Person
			.lookupByName(request.query.name)
			.then(results => {
				response.end(
					JSON.stringify(
						results[0].map(result => {
							return result.name;
						})
					)
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
}

module.exports = PersonController;
