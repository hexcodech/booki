module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {

			params: {
				bookId: Joi.number().integer().positive().required(),
			}

		}
	}

};
