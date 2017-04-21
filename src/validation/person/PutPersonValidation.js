module.exports = ({config}) => {

	const Joi = require('joi');

	return {
		body: {
			params: {
				personId: Joi.number().integer().positive().required(),
			},

			body: {
				condition: {
					id          : Joi.number().integer().positive().allow(null),
					nameTitle   : Joi.string().allow('', null),
					nameFirst   : Joi.string().allow('', null),
					nameMiddle  : Joi.string().allow('', null),
					nameLast    : Joi.string().allow('', null),
					verified    : Joi.boolean().allow(null)
				}
			}
		}
	}

};
