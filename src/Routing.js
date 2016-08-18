/**
 * Manages the REST routing
 * @constructor
 * @param	{Booki}		booki			- The main class of this project
 */

var Routing = function(booki){
	//keep reference to "this"
	var self			= this;
	
	//Require modules
	this.AuthController	= require("./controllers/AuthController");
	
	this.BookController	= require("./controllers/BookController");
	this.UserController	= require("./controllers/UserController");

	this.book_isbn13_id = require("./validation/book_isbn13_id");
	this.book_post		= require("./validation/book_post");
	
	//Init variables
	this.userController = new this.UserController(booki.i18n, booki.errors, booki.sqlConnection);
	this.bookController = new this.BookController(booki.sqlConnection);
	
	//Start routing
	
	
	//User
	
		//AUTH
			
			/*
				Redirects the user to Facebook. When the authentication completes,
				Facebook will redirect the user back to us at
				/auth/facebook/callback
			*/
			booki.app.get("/auth/facebook",			booki.passport.authenticate("facebook", {
				session: false
			}));
			booki.app.get("/auth/facebook/callback",	booki.passport.authenticate("facebook", {
				successRedirect: "/",
				failureRedirect: "/login"
			}));
	
		//GET

			booki.app.get("/user/:id", function(request, response){
				this.userController.get(request.params.id, function (result){
					response.end(JSON.stringify(result));
				});
			});

	//Book

		//GET

			//Get from database
			booki.app.get("/book/isbn13/:id", booki.validate(this.book_isbn13_id), function(request, response){
				this.bookController.selectBookISBN13(request.params.id, function (result){
					response.end(JSON.stringify(result));
				});
			});

			//Get from Google API, cache this for 12 hours.
			booki.app.get("/book/google/isbn13/:id", booki.validate(this.book_isbn13_id), booki.apicacheMiddle('12 hours'), function (request, response) {
				request.apicacheGroup	= "googleBooks";

				this.bookController.selectBookISBN13GoogleAPI(request.params.id, function (result) {
					response.end(JSON.stringify(result));
				});
			});

		//POST
	
			//Add new book to database
			booki.app.post("/book", booki.validate(this.book_post), function(request, response)	{
				
			});
};

module.exports = Routing;