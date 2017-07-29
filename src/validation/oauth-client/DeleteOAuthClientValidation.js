module.exports = () => {
	const Joi = require("joi");

	return {
		params: {
			clientId: Joi.number().integer().positive().required()
		}
	};
};
