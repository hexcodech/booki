module.exports = () => {
	const Joi = require("joi");

	return {
		body: {
			username: Joi.string().email().required(),
			password: Joi.string().required()
		}
	};
};
