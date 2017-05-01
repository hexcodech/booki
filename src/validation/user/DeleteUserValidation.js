module.exports = function({ config }) {
	const Joi = require("joi");

	return {
		params: {
			userId: Joi.number().integer().positive().required()
		}
	};
};
