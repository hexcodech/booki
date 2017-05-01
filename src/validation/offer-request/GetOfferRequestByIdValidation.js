module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			params: {
				offerRequestId: Joi.number().integer().positive().required()
			}
		}
	};
};
