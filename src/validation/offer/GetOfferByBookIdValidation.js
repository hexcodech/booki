module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			bookId: Joi.number().integer().positive().required()
		}
	};
};
