module.exports      = ({Joi}) => {
	
	return {
		body: {
			client: {
				_id						: Joi.string(),
				name					: Joi.string().required(),
				redirectUris			: Joi.array().items(Joi.string().uri({scheme: ['https', 'http']})).required(),
				userId					: Joi.string().allow(''),
				trusted					: Joi.boolean()
			}
		}
	}
	
};