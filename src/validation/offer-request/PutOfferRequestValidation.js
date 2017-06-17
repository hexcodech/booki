module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			offerRequestId: Joi.number().integer().positive().required()
		},

		body: {
			offerRequest: {
				id: Joi.number().integer().positive().allow(null),
				userId: Joi.number().integer().positive(),
				/*offerId: Joi.number().integer().positive(),*/
				message: Joi.string().max(2000).allow(null),
				requested: Joi.boolean(),
				responded: Joi.boolean()
			}
		}
	};
};
