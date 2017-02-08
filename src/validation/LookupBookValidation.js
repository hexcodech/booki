module.exports      = ({Joi}) => {
	
	return {
		
		query: {
			
			isbn						: Joi.string().min(10).max(26),//including dashes and/or spaces
			title						: Joi.string().max(512)
			
		}
	}
	
};