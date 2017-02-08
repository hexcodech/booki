module.exports      = ({Joi, config: {LOCALES: supportedLocales} }) => {
	
	return {
		body: {
			firstName			: Joi.string().regex(/[A-z]+/).min(2).max(256).required(),
			email				: Joi.string().email().required(),
			locale				: Joi.string().regex(new RegExp(supportedLocales.join("|"))),
		}
	}
	
};