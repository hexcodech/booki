module.exports      = function({Joi}){
	
	return {
		body: {
			
			user: {
				name						: Joi.object().keys({
					display						: Joi.string().regex(/[A-z]+/).min(2).max(511).required(),
					first						: Joi.string().regex(/[A-z]+/).min(2).max(255).required(),
					last						: Joi.string().regex(/[A-z]+/).min(2).max(255).required(),
				}),
				
				email						: Joi.object().keys({
					verified					: Joi.string().email(),
					unverified					: Joi.string().email(),
					verificationCode			: Joi.string(),
				}),
				
				password					: Joi.object().keys({
					hash						: Joi.string(),
					salt						: Joi.string(),
					algorithm					: Joi.string(),
					
					resetCode					: Joi.string(),
				}),
				
				capabilities				: Joi.array().items(Joi.string()),
				
				locale						: Joi.string(),
				placeOfResidence			: Joi.string(),
				
				created						: Joi.date(),
				
				profilePictureURL			: Joi.string().uri({scheme: ['http', 'https']}),
				
				facebook					: {
					friends						: Joi.array(), // maybe this should be described in more detail..
					
					accessToken					: Joi.string(),
					refreshToken				: Joi.string(),
				},
				
				google						: {
					accessToken					: Joi.string(),
					refreshToken				: Joi.string(),
				},
				
				/* for updating self */
				
				newPassword					: Joi.string().min(8).max(255),
				newEmail					: Joi.string().email(),
			}
			
		}
	}
	
};