module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			condition: {
				id: Joi.number().integer().positive().allow(null),
				key: Joi.string().required(),
				priceFactor: Joi.number().positive().required()
			}
		}
	};
};
