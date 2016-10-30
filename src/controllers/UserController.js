/**
 * Holds the different user functions
 */

class UserController {
	
	constructor({booki, config, app, i18n, errorController, getLocale}, User){
	
		//store passed parameters
		this.config							= config;
		this.app							= app;
		this.i18n							= i18n;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		
		this.User							= User;
		
		this.LocalRegistrationValidation	= require("../validation/LocalRegistrationValidation")(booki);
		this.VerifyMailValidation			= require("../validation/VerifyMailValidation")(booki);
		
		this.app.post("/v1/register", booki.validate(this.LocalRegistrationValidation), (request, response) => {
			
		    var firstName		= request.body.firstName,
		        email			= request.body.email
		        preferredLocale	= request.body.preferredLocale;
		        
	        if(!preferredLocale){
		        preferredLocale = this.getLocale(null, request);
	        }
		    
		    this.User.register(firstName, email, preferredLocale, (error, user) => {
			    
		    	if(error){
		    		errorController.expressErrorResponse(request, response, error);
		    	}else{
			    	response.json(user.toJSON());
		    	}
		    	
		    	response.end();
		    });
		});
		
		this.app.get("/v1/verify-email", booki.validate(this.VerifyMailValidation), (request, response) => {
			
		    var	email					= request.body.email,
		    	mailVerificationCode	= request.body.mailVerificationCode,
		        password				= request.body.password;
		   
		    this.User.findOne({email: email}, (err, user) => {
			    
		    	if(err){
					
					this.errorController.expressErrorResponse(request, response, new this.errorController.errors.DatabaseError({
						message: err.message
					}), this.getLocale(user, request));
					
		    	}else if(user){
		    		
		    		if(user.mailVerificationCode === mailVerificationCode){
		    			
		    			//If it's the registration process, the passwordResetCode is equal to the verification code
		    			if(password){
		    				if(!user.updatePassword(password, mailVerificationCode)){
			    				//TODO throw error
			    			}
		    			}
		    		}else{
		    			//TODO throw error
		    		}
		    	}else{
			    	//no user was found
		    	}
		    });
		   
		});
		
	}
	
};

module.exports = UserController;