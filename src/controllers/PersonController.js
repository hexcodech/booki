class PersonController{

	constructor({
		booki, models, errorController
	}){

		const bindAll                     = require('lodash/bindAll');
		this.errorController              = errorController;

		this.Person                       = models.Person;

		bindAll(this, [
			'lookupPerson'
		]);

	}

	lookupPerson(request, response, next){
		this.Person.lookupByName(request.query.name).then((results) => {
			response.end(JSON.stringify(results[0].map((result) => {
				return result.name;
			})));
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

}

module.exports = PersonController;
