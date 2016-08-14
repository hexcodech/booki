/**
 * Manages the REST routing
 * @constructor
 * @param	{Booki}		booki			- The main class of this project
 */

var Routing = function(booki){
	//keep reference to "this"
	var self			= this;
	
	//Require modules
	
	
	//Init variables
	
	
	//Start routing
	
	
	//User
	
		//AUTH
			
			/*
				Redirects the user to Facebook. When the authentication completes,
				Facebook will redirect the user back to us at
				/auth/facebook/callback
			*/
			booki.rest.get("/auth/facebook",			passport.authenticate("facebook"));
			booki.rest.get("/auth/facebook/callback",	passport.authenticate("facebook", {
				successRedirect: "/",
				failureRedirect: "/login"
			}));
	
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