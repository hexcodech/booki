module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {

			params: {
				personId: Joi.number().integer().positive().required(),
			}

		}
	}

};
