module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			thumbnailTypeId: Joi.number().integer().positive().required()
		},

		body: {
			thumbnailType: {
				id: Joi.number().integer().positive(),
				name: Joi.string(),
				width: Joi.number().integer().positive(),
				height: Joi.number().integer().positive()
			}
		}
	};
};
