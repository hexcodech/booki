module.exports = () => {
	const Joi = require("joi");

	return {
		params: {
			clientId: Joi.number().integer().positive().required()
		},

		body: {
			client: {
				id: Joi.number().integer().positive(),
				name: Joi.string().required(),
				redirectUris: Joi.array()
					.items(Joi.string().uri({ scheme: ["https", "http"] }))
					.required(),

				userId: Joi.number().integer().positive(),
				trusted: Joi.boolean().allow(null)
			}
		}
	};
};
