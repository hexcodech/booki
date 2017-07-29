module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		body: {
			user: {
				id: Joi.number().integer().positive().allow(null),

				nameDisplay: Joi.string().regex(/[A-z]+/).max(511).required(),
				nameFirst: Joi.string().regex(/[A-z]+/).max(255).required(),
				nameLast: Joi.string().regex(/[A-z]+/).max(255).allow("", null),

				emailVerified: Joi.string().email().allow("", null),
				emailUnverified: Joi.string().email().allow("", null),
				emailVerificationCode: Joi.string().allow("", null),

				passwordHash: Joi.string().allow("", null),
				passwordSalt: Joi.string().allow("", null),
				passwordAlgorithm: Joi.string().allow("", null),

				passwordResetCode: Joi.string().allow("", null),
				passwordResetCodeExpirationDate: Joi.date().allow(null),

				permissions: Joi.array().items(Joi.string().max(127)),

				locale: Joi.string().valid(config.LOCALES).required(),
				placeOfResidence: Joi.string().allow("", null),

				created: Joi.date().allow(null),

				facebook: {
					accessToken: Joi.string().allow("", null),
					refreshToken: Joi.string().allow("", null)
				},

				google: {
					accessToken: Joi.string().allow("", null),
					refreshToken: Joi.string().allow("", null)
				},

				profilePictureId: Joi.number().integer().positive().allow(null)
			}
		}
	};
};
