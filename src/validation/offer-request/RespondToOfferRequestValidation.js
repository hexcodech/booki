module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			offerRequestId: Joi.number().integer().positive().required()
		},

		query: {
			responseKey: Joi.string().required()
		}
	};
};
