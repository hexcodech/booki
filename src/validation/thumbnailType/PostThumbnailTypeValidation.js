module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {

			thumbnailType: {
				id          : Joi.number().integer().positive().allow(null),
				name        : Joi.string().required(),
				width       : Joi.number().integer().positive().required(),
				height      : Joi.number().integer().positive().required(),
			}

		}
	}

};
