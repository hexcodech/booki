module.exports      = ({Joi}) => {
	
	return {
		body: {
			username			: Joi.string().email().required(),
			password			: Joi.string().required(),
		}
	}
	
};