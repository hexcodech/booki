module.exports = () => {

	const Joi = require('joi');

	return {
		body: {
			book: {
				id                : Joi.number().integer().positive(),

				isbn13            : Joi.string().required(),

				title             : Joi.string().max(512).required(),
				subtitle          : Joi.string().max(512).allow('', null),

				language          : Joi.string().min(2).max(4).required(),

				authors           : Joi.array().items(),

				description       : Joi.string().max(1024).allow('', null),

				publisher         : Joi.string().max(256).allow('', null),
				publicationDate   : Joi.date().allow('', null),

				pageCount         : Joi.number().integer().positive().required(),

				coverId           : Joi.number().integer().positive(),

				approved          : Joi.boolean(),
				dateCreated       : Joi.date().allow('', null),
				userId            : Joi.number().integer().positive().allow('', null)

			}
		}
	}

};
