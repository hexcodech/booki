module.exports = () => {

	const Joi = require('joi');

	return {

		params: {
			imageId: Joi.number().integer().positive().required(),
		},

		body: {
			id: Joi.number().integer().positive().required().allow()
		}

	}

};
