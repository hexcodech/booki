module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {

			params: {
				id: Joi.number().integer().positive().required(),
			}

		}
	}

};
