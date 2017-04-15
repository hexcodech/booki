module.exports = () => {

	const Joi = require('joi');

	return {

		params: {
			clientId: Joi.number().required()
		},

		body: {
			client: {
				id                : Joi.number(),
				name              : Joi.string().required(),
				redirectUris      : Joi.array().items(Joi.string()
				                    .uri({scheme: ['https', 'http']})).required(),

				userId            : Joi.number(),
				trusted           : Joi.boolean().allow(null)
			}
		}
	}

};
