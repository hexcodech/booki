module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {

			params: {
				id: Joi.number().integer().positive().required(),
			},

			body: {

				offer: {
					id          : Joi.number().integer().positive(),
					description : Joi.string().max(2000).allow('', null),
					price       : Joi.number().positive(),

					bookId       : Joi.number().integer().positive(),
					userId       : Joi.number().integer().positive(),
					conditionId  : Joi.number().integer().positive(),
				}

			}

		}
	}

};
