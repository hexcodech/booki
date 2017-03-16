module.exports = ({config: {LOCALES: supportedLocales} }) => {

	const Joi = require('joi');

	return {
		body: {
			firstName     : Joi.string().regex(/[A-z]+/).min(2).max(256).required(),
			email         : Joi.string().email().required(),
			locale        : Joi.string().regex(new RegExp(supportedLocales.join('|'))),
		}
	}

};
