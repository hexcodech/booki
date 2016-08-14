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

			booki.rest.get("/user/:id", function(request, response){
				booki.user.selectUserID(request.params.id, function (result) {
					response.end(
						result
					)
				});
			});
	
};

module.exports = Routing;