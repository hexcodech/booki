/**
 * Holds the different user functions
 * @constructor
 */

var UserController = function(app, i18n, errors, User){
	
	var self			= this;
	
	//store passed parameters
	self.app			= app;
	self.i18n			= i18n;
	self.errors			= errors;
	
	//Require modules
	self.User			= User;
	
	self.events			= require("events");
	
	//init values
	self.eventEmitter	= new self.events.EventEmitter();
	
	self.app.post("/register", function(request, response){
		
	    var first_name		= request.body.first_name,
	        last_name		= request.body.last_name,
	        email			= request.body.email
	        preferedLocale	= request.body.preferedLocale;
	    
	    self.User.register(first_name, last_name, email, preferedLocale, function(error, user){
	    	if(error){
	    		console.log(error);
	    	}else{
	    		console.log(user);
	    	}
	    	response.end();
	    });
	});
};

module.exports = UserController;