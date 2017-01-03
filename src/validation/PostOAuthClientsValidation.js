module.exports      = function({Joi}){
	
	return {
		body: {
			name					: Joi.string().required(),
			redirectUris			: Joi.array().items(Joi.string().uri({scheme: ['https', 'http']})).required()
		}
	}
	
};