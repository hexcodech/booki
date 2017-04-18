module.exports = () => {

	const Joi = require('joi');

	return {

		params: {
			imageId: Joi.number().required(),
		},

	}

};
