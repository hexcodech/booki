/**
 * Holds the different user functions
 * @constructor
 */

var UserController = function(app, i18n, errorController, User){
	
	var self			= this;
	
	//store passed parameters
	self.app				= app;
	self.i18n				= i18n;
	self.errorController	= errorController;
	
	//Require modules
	self.User				= User;
	
	self.events				= require("events");
	
	//init values
	self.eventEmitter		= new self.events.EventEmitter();
	
	self.app.post("/register", function(request, response){
		
	    var firstName		= request.body.firstName,
	        lastName		= request.body.lastName,
	        email			= request.body.email
	        preferedLocale	= request.body.preferedLocale;
	    
	    self.User.register(firstName, lastName, email, preferedLocale, function(error, user){
	    	if(error){
	    		errorController.expressErrorResponse(request, response, error);
	    	}else{
	    		console.log(user);
	    	}
	    	response.end();
	    });
	});
	
	self.app.post("/confirm-email", function(request, response){
		
	    var	email					= request.body.email,
	    	mailConfirmationCode	= request.body.mailConfirmationCode,
	        password				= request.body.password;
	   
	    self.User.findOne({email: email}, function(err, user){
	    	if(err){
	    		new self.errorController.errors.DatabaseError({
					message: err.message
				});
	    		//TODO throw it
	    	}else{
	    		
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
	    	}
	    });
	   
	});
	
};

module.exports = UserController;