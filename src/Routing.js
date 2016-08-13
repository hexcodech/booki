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
				booki.sqlConnection.query("SELECT * FROM users WHERE id=" + request.params.id, function (err, results) {
					if(err)
						throw err;
					
					response.end(
						JSON.stringify(results)
					);
				});
			});
	
};

module.exports = Routing;