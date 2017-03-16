module.exports = () => {

	const Joi = require('joi');

	return {
		body: {
			client: {
				id                : Joi.number(),
				name              : Joi.string().required(),
				redirectUris      : Joi.array().items(Joi.string()
				                    .uri({scheme: ['https', 'http']})).required(),

				userId            : Joi.string().allow(''),
				trusted           : Joi.boolean()
			}
		}
	}

};
