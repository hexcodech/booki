module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {

			params: {
				conditionId: Joi.number().integer().positive().required(),
			}

		}
	}

};
