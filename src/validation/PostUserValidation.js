module.exports = () => {

	const Joi = require('joi');

	return {
		body: {

			user: {
				id                                : Joi.number(),

				nameDisplay                       : Joi.string().regex(/[A-z]+/)
				                                    .max(511),
				nameFirst                         : Joi.string().regex(/[A-z]+/)
				                                    .max(255).allow('', null),
				nameLast                          : Joi.string().regex(/[A-z]+/)
				                                    .max(255).allow('', null),

				emailVerified                     : Joi.string().email().allow('', null),
				emailUnverified                   : Joi.string().email().allow('', null),
				emailVerificationCode             : Joi.string().allow('', null),

				passwordHash                      : Joi.string().allow('', null),
				passwordSalt                      : Joi.string().allow('', null),
				passwordAlgorithm                 : Joi.string().allow('', null),

				passwordResetCode                 : Joi.string().allow('', null),
				passwordResetCodeExpirationDate   : Joi.date(),

				permissions                       : Joi.array().items(
				                                      Joi.string().max(127)
				                                    ),

				locale                            : Joi.string().allow('', null),
				placeOfResidence                  : Joi.string().allow('', null),

				created                           : Joi.date().allow('', null),

				profilePictureUrl                 : Joi.string().uri({
				                                      scheme: ['http', 'https']
				                                    }).allow(''),

				facebook: {
					accessToken                     : Joi.string().allow('', null),
					refreshToken                    : Joi.string().allow('', null),
				},

				google: {
					accessToken                     : Joi.string().allow('', null),
					refreshToken                    : Joi.string().allow('', null),
				}

			}

		}
	}

};
