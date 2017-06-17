class PersonController {
	constructor({ booki, models }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

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
			})
			.catch(next);
	}

	getPersonById(request, response, next) {
		this.models.Person
			.findOne({ where: { id: request.params.personId } })
			.then(person => {
				if (!person) {
					return Promise.reject(new Error("This person wasn't found!"));
				}

				if (request.hasPermission("admin.person.read")) {
					response.json(person.toJSON({ admin: true }));
				} else {
					response.json(person.toJSON());
				}
				return response.end();
			})
			.catch(next);
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
			.catch(next);
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

					return person.save().then(() => {
						if (request.hasPermission("admin.person.read")) {
							response.json(person.toJSON({ admin: true }));
						} else {
							response.json(person.toJSON());
						}
					});
				} else {
					return Promise.reject(new Error("This person wasn't found!"));
				}
			})
			.catch(next);
	}

	deletePerson(request, response, next) {
		this.models.Person
			.findOne({ where: { id: request.params.personId } })
			.then(person => {
				if (!person) {
					return Promise.reject(new Error("This person wasn't found!"));
				}

				return person.destroy().then(() => {
					response.json({ success: true });
					response.end();
				});
			})
			.catch(next);
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
			.catch(next);
	}
}

module.exports = PersonController;
