/**
 * Holds the different user functions
 * @constructor
 */

var UserController = function(app, i18n, errors, User){
	//store passed params
	this.app			= app;
	this.i18n			= i18n;
	this.errors			= errors;
	
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.User			= User;
	
	this.events			= require("events");
	
	//init values
	this.eventEmitter	= new this.events.EventEmitter();
	
	app.post("/register", function(request, response){
	    var first_name	= request.body.first_name,
	        last_name	= request.body.last_name,
	        email		= request.body.email;
	    
	    User.register(first_name, last_name, email, function(error, user){
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