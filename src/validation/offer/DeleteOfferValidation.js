module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			params: {
				offerId: Joi.number().integer().positive().required()
			}
		}
	};
};
