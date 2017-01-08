module.exports      = function({Joi}){
	
	return {
		body: {
			name					: Joi.string().allow(''),,
			secret					: Joi.object().keys({
				hash						: Joi.string().allow(''),,
				salt						: Joi.string().allow(''),,
				algorithm					: Joi.string().allow(''),
			}),
			
			trusted					: Joi.boolean(),
			redirectUris			: Joi.array().items(Joi.string().uri({scheme: ['https', 'http']}))
		}
	}
	
};