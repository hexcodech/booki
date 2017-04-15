module.exports = () => {

	const Joi = require('joi');

	return {

		query: {

			search           : Joi.string().max(512)

		}
	}

};
