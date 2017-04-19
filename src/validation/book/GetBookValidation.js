module.exports = () => {

	const Joi = require('joi');

	return {

		body: {
			search            : Joi.string().allow(''),
		}
	}

};
