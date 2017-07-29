module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		query: {
			check: Joi.boolean()
		}
	};
};
