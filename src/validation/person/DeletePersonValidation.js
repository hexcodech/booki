module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			personId: Joi.number().integer().positive().required()
		}
	};
};
