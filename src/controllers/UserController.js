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
		this.ConfirmMailValidation			= require("../validation/ConfirmMailValidation")(booki);
		
		this.app.post("/v1/register", booki.validate(this.LocalRegistrationValidation), (request, response) => {
			
		    var firstName		= request.body.firstName,
		        email			= request.body.email
		        preferredLocale	= request.body.preferredLocale;
		    
		    this.User.register(firstName, email, preferredLocale, (error, user) => {
			    
		    	if(error){
		    		errorController.expressErrorResponse(request, response, error);
		    	}else{
		    		console.log(user);
		    	}
		    	
		    	response.end();
		    });
		});
		
		this.app.post("/v1/confirm-email", booki.validate(this.ConfirmMailValidation), (request, response) => {
			
		    var	email					= request.body.email,
		    	mailConfirmationCode	= request.body.mailConfirmationCode,
		        password				= request.body.password;
		   
		    this.User.findOne({email: email}, (err, user) => {
			    
		    	if(err){
					
					this.errorController.expressErrorResponse(request, response, new this.errorController.errors.DatabaseError({
						message: err.message
					}), this.getLocale(user, request));
					
		    	}else if(user){
		    		
		    		if(user.mailConfirmationCode === mailConfirmationCode){
		    			
		    			//If it's the registration process, the passwordResetCode is equal to the mailConfirmation code
		    			if(password){
		    				if(!user.updatePassword(password, mailConfirmationCode)){
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