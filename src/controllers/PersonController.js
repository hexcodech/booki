class PersonController {
	constructor({ booki, models, errorController }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.errorController = errorController;

		this.models = models;

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
		this.models.Person
			.findAll()
			.then(people => {
				if (people) {
					if (request.hasPermission("admin.person.read")) {
						response.json(
							people.map(person => {
								return person.toJSON({ admin: true });
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
		this.models.Person
			.findOne({ where: { id: request.params.personId } })
			.then(person => {
				if (person) {
					if (request.hasPermission("admin.person.read")) {
						response.json(person.toJSON({ admin: true }));
					} else {
						response.json(person.toJSON());
					}
					return response.end();
				}

				return next(new this.errorController.errors.NotFoundError());
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
		let person = this.models.Person.build(
			this.pick(request.body.person, [
				"nameTitle",
				"nameFirst",
				"nameMiddle",
				"nameLast"
			])
		);

		if (request.hasPermission("admin.person.write")) {
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
				if (request.hasPermission("admin.person.read")) {
					response.json(person.toJSON({ admin: true }));
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
		this.models.Person
			.findOne({ where: { id: request.params.personId } })
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

					if (request.hasPermission("admin.person.write")) {
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
							if (request.hasPermission("admin.person.read")) {
								response.json(person.toJSON({ admin: true }));
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
		this.models.Person
			.findOne({ where: { id: request.params.personId } })
			.then(person => {
				if (person) {
					person
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

	lookupPerson(request, response, next) {
		this.models.Person
			.lookupByName(request.query.search)
			.then(people => {
				response.end(
					JSON.stringify(
						people.map(person => {
							return ((person.nameTitle ? person.nameTitle + " " : "") +
								(person.nameFirst ? person.nameFirst + " " : "") +
								(person.nameMiddle ? person.nameMiddle + " " : "") +
								(person.nameLast ? person.nameLast : "")).trim();
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
