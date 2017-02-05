module.exports      = function({Joi}){
	
	return {
		body: {
			email					: Joi.string().email().required()
		}
	}
	
};