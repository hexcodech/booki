module.exports      = function({Joi}){
	
	return {
		body: {
			name					: Joi.string().alphanum().required(),
			redirectUris			: Joi.array().items(Joi.string().uri({scheme: ['https']})).required()
		}
	}
	
};