module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			offerRequest: {
				id: Joi.number().integer().positive().allow(null),
				offerId: Joi.number().integer().positive().required(),
				email: Joi.string().max(255).allow(null),
				message: Joi.string().max(2000).allow(null),
				responded: Joi.boolean()
			}
		}
	};
};
