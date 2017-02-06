module.exports      = function({Joi}){
	
	return {
		body: {
			
			user: {
				_id							: Joi.string().allow(''),

				name						: Joi.object().keys({
					display						: Joi.string().regex(/[A-z]+/).max(511).allow(''),
					first						: Joi.string().regex(/[A-z]+/).max(255).allow(''),
					last						: Joi.string().regex(/[A-z]+/).max(255).allow(''),
				}),
				
				email						: Joi.object().keys({
					verified					: Joi.string().email().allow(''),
					unverified					: Joi.string().email().allow(''),
					verificationCode			: Joi.string().allow(''),
				}),
				
				password					: Joi.object().keys({
					hash						: Joi.string().allow(''),
					salt						: Joi.string().allow(''),
					algorithm					: Joi.string().allow(''),
					
					resetCode					: Joi.string().allow(''),
				}),
				
				permissions					: Joi.array().items(Joi.string()),
				
				locale						: Joi.string().allow(''),
				placeOfResidence			: Joi.string().allow(''),
				
				created						: Joi.date().allow(''),
				
				profilePictureUrl			: Joi.string().uri({scheme: ['http', 'https']}).allow(''),
				
				facebook					: {
					friends						: Joi.array(), // maybe this should be described in more detail..
					
					accessToken					: Joi.string().allow(''),
					refreshToken				: Joi.string().allow(''),
				},
				
				google						: {
					accessToken					: Joi.string().allow(''),
					refreshToken				: Joi.string().allow(''),
				},
				
				/* for updating self */
				
				newPassword					: Joi.string().min(8).max(255).allow(''),
				newEmail					: Joi.string().email().allow(''),
			}
			
		}
	}
	
};