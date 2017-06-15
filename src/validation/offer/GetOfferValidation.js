module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		query: {
			filter: {
				latest: Joi.boolean()
			}
		}
	};
};
