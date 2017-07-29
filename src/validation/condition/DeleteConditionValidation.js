module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			conditionId: Joi.number().integer().positive().required()
		}
	};
};
