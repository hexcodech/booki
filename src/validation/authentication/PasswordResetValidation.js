module.exports = ({}) => {
	const Joi = require("joi");

	return {
		body: {
			email: Joi.string().email().required(),
			resetCode: Joi.string().required(),
			password: Joi.string().min(8).max(255)
		}
	};
};
