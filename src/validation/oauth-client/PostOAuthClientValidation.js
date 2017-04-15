module.exports = () => {

	const Joi = require('joi');

	return {
		body: {
			client: {
				id              : Joi.number().allow(null),
				name            : Joi.string().required(),
				redirectUris    : Joi.array().items(
				                    Joi.string().uri({scheme: ['https', 'http']})
				                  ).required(),
				userId          : Joi.number(),
				trusted         : Joi.boolean().allow(null)
			}
		}
	}

};
