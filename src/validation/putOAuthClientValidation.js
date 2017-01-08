module.exports      = function({Joi}){
	
	return {
		body: {
			name					: Joi.string(),
			secret					: Joi.object().keys({
				hash						: Joi.string(),
				salt						: Joi.string(),
				algorithm					: Joi.string()
			}),
			
			trusted					: Joi.boolean(),
			redirectUris			: Joi.array().items(Joi.string().uri({scheme: ['https', 'http']}))
		}
	}
	
};