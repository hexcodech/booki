module.exports = function({ config }) {
	const Joi = require("joi");

	return {
		params: {
			userId: Joi.number().integer().positive().required()
		},

		body: {
			user: {
				id: Joi.number().integer().positive(),

				nameDisplay: Joi.string().regex(/[A-z]+/).max(511),
				nameFirst: Joi.string().regex(/[A-z]+/).max(255),
				nameLast: Joi.string().regex(/[A-z]+/).max(255).allow("", null),

				emailVerified: Joi.string().email().allow(""),
				emailUnverified: Joi.string().email().allow("", null),
				emailVerificationCode: Joi.string().allow("", null),

				passwordHash: Joi.string().allow("", null),
				passwordSalt: Joi.string().allow("", null),
				passwordAlgorithm: Joi.string().allow("", null),

				passwordResetCode: Joi.string().allow("", null),
				passwordResetCodeExpirationDate: Joi.date().allow(null),

				permissions: Joi.array().items(Joi.string().max(127)),

				locale: Joi.string().valid(config.LOCALES),
				placeOfResidence: Joi.string().allow("", null),

				created: Joi.date(),

				facebook: {
					accessToken: Joi.string().allow("", null),
					refreshToken: Joi.string().allow("", null)
				},

				google: {
					accessToken: Joi.string().allow("", null),
					refreshToken: Joi.string().allow("", null)
				},

				profilePictureId: Joi.number().integer().positive().allow(null),

				newPassword: Joi.string().min(8).max(256).allow("", null),

				newEmail: Joi.string().email().allow("", null)
			}
		}
	};
};
