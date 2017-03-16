module.exports = () => {

	const Joi = require('joi');

	return {
		body: {

			user: {
				id                                : Joi.number(),

				nameDisplay                       : Joi.string().regex(/[A-z]+/)
				                                    .max(511).allow(''),
				nameFirst                         : Joi.string().regex(/[A-z]+/)
				                                    .max(255).allow(''),
				nameLast                          : Joi.string().regex(/[A-z]+/)
				                                    .max(255).allow(''),

				emailVerified                     : Joi.string().email().allow(''),
				emailUnverified                   : Joi.string().email().allow(''),
				emailVerificationCode             : Joi.string().allow(''),

				passwordHash                      : Joi.string().allow(''),
				passwordSalt                      : Joi.string().allow(''),
				passwordAlgorithm                 : Joi.string().allow(''),

				passwordResetCode                 : Joi.string().allow(''),
				passwordResetCodeExpirationDate   : Joi.date(),

				permissions                       : Joi.array().items(
				                                      Joi.string().max(127)
				                                    ),

				locale                            : Joi.string().allow(''),
				placeOfResidence                  : Joi.string().allow(''),

				created                           : Joi.date().allow(''),

				profilePictureUrl                 : Joi.string().uri({
				                                      scheme: ['http', 'https']
				                                    }).allow(''),

				facebook: {
					accessToken                     : Joi.string().allow(''),
					refreshToken                    : Joi.string().allow(''),
				},

				google: {
					accessToken                     : Joi.string().allow(''),
					refreshToken                    : Joi.string().allow(''),
				}

			}

		}
	}

};
