module.exports = () => {

	const Joi = require('joi');

	return {

		query: {

			name            : Joi.string().min(1),

		}
	}

};
