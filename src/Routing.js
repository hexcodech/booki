/**
 * Manages the REST routing
 * @constructor
 * @param	{Booki}	booki - The main class of this project
 */

var Routing = function(booki){
	
	var self			= this;
	
	//Store passed variables
	self.booki			= booki;
	
	//Models first
	self.User			= new require("./models/User")(
			self.booki.i18n,
			self.booki.errorController,
			self.booki.mongoose
	);
	
	//Then the controllers
	self.AuthController	= require("./controllers/AuthController");
	
	self.authController	= new self.AuthController(
			self.booki.app,
			self.booki.i18n,
			self.booki.errorController,
			self.User
	);
	
	self.BookController	= require("./controllers/BookController");
	
	self.bookController = new self.BookController(
			self.booki.mongoose
	);
	
	self.UserController	= require("./controllers/UserController");
	
	self.userController	= new self.UserController(
			self.booki.app,
			self.booki.i18n,
			self.booki.errorController,
			self.User
	);

	self.book_isbn13_id	= require("./validation/book_isbn13_id");
	self.book_post		= require("./validation/book_post");
	
	//Start routing

	//Book

		//GET

			//Get from database
			self.booki.app.get("/book/isbn13/:id", self.booki.validate(self.book_isbn13_id), function(request, response){
				
			});

			//Get from Google API, cache this for 12 hours.
			self.booki.app.get("/book/google/isbn13/:id", self.booki.validate(self.book_isbn13_id), booki.apicacheMiddle('12 hours'), function (request, response) {
				request.apicacheGroup	= "googleBooks";
			});

		//POST
	
			//Add new book to database
			self.booki.app.post("/book", self.booki.validate(self.book_post), function(request, response)	{
				
			});
};

module.exports = Routing;