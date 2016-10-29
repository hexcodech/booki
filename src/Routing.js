/**
 * Manages the REST routing
 */

class Routing {
	
	constructor({booki, app, i18n, errorController, mongoose}){
	
		//Store passed variables
		this.app				= app;
		this.i18n				= i18n;
		this.errorController	= errorController;
		this.mongoose			= mongoose;
		
		
		//Models first
		let UserClass			= require("./models/User");
		this.User				= new UserClass(booki);
		
		//Then the controllers
		let AuthController		= require("./controllers/AuthController");
		this.authController		= new AuthController(booki, this.User);
		
		
		let BookController		= require("./controllers/BookController");
		this.bookController	 	= new BookController(booki);
		
		
		let UserController		= require("./controllers/UserController");
		this.userController		= new UserController(booki, this.User);
	
		this.book_isbn13_id		= require("./validation/book_isbn13_id");
		this.book_post			= require("./validation/book_post");
		
		//Start routing
	
		//Book
	
			//GET
	
				//Get from database
				/*this.app.get("/book/isbn13/:id", this.booki.validate(this.book_isbn13_id), (request, response) => {
					
				});
	
				//Get from Google API, cache this for 12 hours.
				this.app.get("/book/google/isbn13/:id", this.booki.validate(this.book_isbn13_id), booki.apicacheMiddle('12 hours'), (request, response) => {
					request.apicacheGroup	= "googleBooks";
				});*/
	
			//POST
		
				//Add new book to database
				/*this.app.post("/book", this.booki.validate(this.book_post), (request, response) => {
					
				});*/
	}
	
};

module.exports = Routing;