module.exports = () => {
	const Joi = require("joi");

	return {
		params: {
			bookId: Joi.number().integer().positive().required()
		}
	};
};
