module.exports = function() {
	const Joi = require("joi");

	return {
		body: {
			email: Joi.string().email().required(),
			emailVerificationCode: Joi.string().required(),
			password: Joi.string().min(8).max(256)
		}
	};
};
