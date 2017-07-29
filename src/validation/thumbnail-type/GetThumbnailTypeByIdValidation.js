module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			thumbnailTypeId: Joi.number().integer().positive().required()
		}
	};
};
