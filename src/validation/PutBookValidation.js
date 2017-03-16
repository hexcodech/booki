module.exports = () => {

	const Joi = require('joi');

	return {

		params: {
			bookId: Joi.string().required(),
		},

		body: {

			book: {
				id                : Joi.number(),

				isbn13            : Joi.string().required(),

				title             : Joi.string().max(512).required(),
				subtitle          : Joi.string().max(512).allow(''),

				language          : Joi.string().min(2).max(4).required(),

				authors           : Joi.array().items(Joi.string().max(256)),

				description       : Joi.string().max(1024).allow(''),

				publisher         : Joi.string().max(256).allow(''),
				publicationDate   : Joi.date().allow(''),

				pageCount         : Joi.number().min(1).required(),

				images            : Joi.object().keys({
					original          : Joi.string().uri({scheme: ['http', 'https']})
					                    .allow(''),

					sizes             : Joi.array().items(Joi.object().keys({
						width             : Joi.number(),
						height            : Joi.number(),
						type              : Joi.string(),
						url               : Joi.string().uri({scheme: ['http', 'https']})
					}))
				}),

				approved          : Joi.boolean(),
				dateCreated       : Joi.date().allow(''),
				createdBy         : Joi.string().allow('')

			}

		}
	}

};
