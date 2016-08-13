/**
 * Manages the REST routing
 * @constructor
 * @param	{Booki}		booki			- The main class of this project
 */

var Routing = function(booki){
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	
	
	//Init variables
	
	
	//Start routing
	
	
	//User
	
		//GET

			booki.rest.get("/user/:id", function(request, response){
				booki.user.selectUserID(request.params.id, function (result) {
					response.end(
						result
					)
				});
			});
	
};

module.exports = Routing;