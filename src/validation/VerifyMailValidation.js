module.exports      = function({Joi}){
	
	return {
		body: {
			email					: Joi.string().email().required(),
		    mailVerificationCode	: Joi.string().required(),
		    password				: Joi.string().min(8).max(255).required()
		}
	}
	
};