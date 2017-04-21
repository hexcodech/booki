module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {
			offerRequest: {
				id          : Joi.number().integer().positive().allow(null),
				offerId     : Joi.number().integer().positive().required(),
				message     : Joi.string().max(2000).allow(null),
				requested   : Joi.boolean(),
				responded   : Joi.boolean(),
			}
		}
	}

};
