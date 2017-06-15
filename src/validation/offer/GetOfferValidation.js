module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		query: {
			filter: {
				newest: Joi.boolean()
			}
		}
	};
};
