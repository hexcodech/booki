module.exports = () => {

	const Joi = require('joi');

	return {
		body: {
			email: Joi.string().email().required()
		}
	}

};
