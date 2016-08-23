/**
 * Manages the REST routing
 * @constructor
 * @param	{Booki}	booki - The main class of this project
 */

var Routing = function(booki){
	//store passed params
	this.booki = booki;
	
	//keep reference to "this"
	var self			= this;
	
	//Require modules
	this.AuthController	= require("./controllers/AuthController");
	
	this.BookController	= require("./controllers/BookController");
	this.UserController	= require("./controllers/UserController");

	this.book_isbn13_id = require("./validation/book_isbn13_id");
	this.book_post		= require("./validation/book_post");
	
	//Init variables
	this.userController = new this.UserController(this.booki.app, this.booki.i18n, this.booki.errors, this.booki.mongoose);
	this.bookController = new this.BookController(this.booki.mongoose);
	
	//Start routing

	//Book

		//GET

			//Get from database
			this.booki.app.get("/book/isbn13/:id", this.booki.validate(this.book_isbn13_id), function(request, response){
				this.bookController.selectthis.bookiSBN13(request.params.id, function (result){
					response.end(JSON.stringify(result));
				});
			});

			//Get from Google API, cache this for 12 hours.
			this.booki.app.get("/book/google/isbn13/:id", this.booki.validate(this.book_isbn13_id), this.booki.apicacheMiddle('12 hours'), function (request, response) {
				request.apicacheGroup	= "googleBooks";

				this.bookController.selectthis.bookiSBN13GoogleAPI(request.params.id, function (result) {
					response.end(JSON.stringify(result));
				});
			});

		//POST
	
			//Add new book to database
			this.booki.app.post("/book", this.booki.validate(this.book_post), function(request, response)	{
				
			});
};

module.exports = Routing;