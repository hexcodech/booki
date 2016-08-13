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

			booki.rest.get("/user/id/:id", function(request, response){
				response.end(
					JSON.stringify(
						booki.User.selectUserID(request.params.id)
					)
				);
			});
	
};

module.exports = Routing;