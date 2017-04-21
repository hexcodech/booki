module.exports = () => {

	const Joi = require('joi');

	return {

		params: {
			bookId: Joi.number().integer().positive().required(),
		},

		body: {
			book: {
				id                : Joi.number().integer().positive(),

				isbn13            : Joi.string().required(),

				title             : Joi.string().max(512).required(),
				subtitle          : Joi.string().max(512).allow(''),

				language          : Joi.string().min(2).max(4).required(),

				authors           : Joi.array().items(Joi.string().max(256)),

				description       : Joi.string().max(1024).allow(''),

				publisher         : Joi.string().max(256).allow(''),
				publicationDate   : Joi.date().allow(''),

				pageCount         : Joi.number().min(1).required(),

				approved          : Joi.boolean(),
				dateCreated       : Joi.date().allow(''),
				createdBy         : Joi.string().allow('')
			}
		}
	}

};
