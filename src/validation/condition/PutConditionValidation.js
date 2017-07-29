module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			conditionId: Joi.number().integer().positive().required()
		},

		body: {
			condition: {
				id: Joi.number().integer().positive(),
				key: Joi.string().allow("", null),
				priceFactor: Joi.number().positive()
			}
		}
	};
};
