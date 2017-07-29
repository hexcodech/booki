module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			offerId: Joi.number().integer().positive().required()
		}
	};
};
