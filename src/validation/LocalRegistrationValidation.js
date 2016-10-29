module.exports      = function({Joi, config: {LOCALES: supportedLocales} }){
	
	return {
		body: {
			firstName			: Joi.string().regex(/A-z/).min(2).max(255).required(),
			lastName			: Joi.string().regex(/A-z/).min(2).max(255).required(),
			email				: Joi.string().email().required(),
			preferedLocale		: Joi.string().regex(new RegExp(supportedLocales.join("|"))).required(),
		}
	}
	
};