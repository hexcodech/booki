module.exports      = ({Joi}) => {
	
	return {
		body: {
			email					: Joi.string().email().required(),
			resetCode				: Joi.string().required()
		}
	}
	
};