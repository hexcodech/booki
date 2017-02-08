module.exports      = ({Joi}) => {
	
	return {
		body: {
			email					: Joi.string().email().required()
		}
	}
	
};