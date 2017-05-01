module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			offer: {
				id: Joi.number().integer().positive().allow(null),
				description: Joi.string().max(2000).required(),
				price: Joi.number().positive().required(),

				bookId: Joi.number().integer().positive().required(),
				userId: Joi.number().integer().positive(),
				conditionId: Joi.number().integer().positive().required()
			}
		}
	};
};
