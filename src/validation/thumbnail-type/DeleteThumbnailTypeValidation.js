module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			params: {
				thumbnailTypeId: Joi.number().integer().positive().required()
			}
		}
	};
};
