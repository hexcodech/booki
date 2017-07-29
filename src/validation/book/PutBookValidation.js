module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		params: {
			bookId: Joi.number().integer().positive().required()
		},

		body: {
			book: {
				id: Joi.number().integer().positive(),

				isbn13: Joi.string().alphanum().min(13).max(13).required(),

				title: Joi.string().max(512).required(),
				subtitle: Joi.string().max(512).allow("", null),

				language: Joi.string().min(2).max(4).valid(config.LOCALES).required(),

				authors: Joi.array().items(Joi.string().max(256)),

				description: Joi.string().max(1024).allow(""),

				publisher: Joi.string().max(256).allow("", null),
				publicationDate: Joi.date().allow("", null),

				pageCount: Joi.number().min(1).required(),

				approved: Joi.boolean(),
				dateCreated: Joi.date().allow(""),
				createdBy: Joi.string().allow("")
			}
		}
	};
};
