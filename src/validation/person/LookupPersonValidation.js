module.exports = () => {
	const Joi = require("joi");

	return {
		query: {
			search: Joi.string().min(1)
		}
	};
};
