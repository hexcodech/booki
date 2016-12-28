/**
 * Manages the REST routing
 */

class Routing {
	
	constructor({booki, app, config, i18n, errorController, mongoose, validate}){
	
		//Store passed variables
		this.app						= app;
		this.config						= config;
		this.i18n						= i18n;
		this.errorController			= errorController;
		this.mongoose					= mongoose;
		
		this.validate					= validate;
		
		booki.bindAll(this, []);
		
		//Autentication
		
		let AuthController									= require("./controllers/AuthController");
		this.authController									= new AuthController(booki);
		
		
		this.LocalLoginValidation							= require("./validation/LocalLoginValidation")(booki);
		this.LocalRegistrationValidation					= require("./validation/LocalRegistrationValidation")(booki);
		this.VerifyMailValidation							= require("./validation/VerifyMailValidation")(booki);
		
		this.app.get("/views/login",						this.authController.loginView,
															this.authController.catchInternalErrorView
		);
		this.app.get("/views/verify-email",					this.authController.mailVerificationView,
															this.authController.catchInternalErrorView
		);
		
		this.app.post("/v1/auth/local/login",				this.validate(this.LocalLoginValidation),
															this.authController.authLocal,
															this.authController.catchInternalErrorView
		);
		
		this.app.post("/v1/auth/local/register",			this.validate(this.LocalRegistrationValidation),
															this.authController.registration,
															this.authController.catchInternalErrorView
		);
		this.app.post("/v1/auth/local/verify-email",		this.validate(this.VerifyMailValidation),
															this.authController.verifyEmail,
															this.authController.isAuthenticated,
															this.authController.catchInternalErrorView
		);
		this.app.get("/v1/auth/facebook/login/",			this.authController.authFacebook,
															this.authController.catchInternalError
		);
		this.app.get(this.config.FACEBOOK_CALLBACK_PATH,	this.authController.authFacebookCallback,
															this.authController.catchInternalError
		);
		
		this.app.get("/v1/auth/google/login/",				this.authController.authGoogle,
															this.authController.catchInternalError
		);
		this.app.get(this.config.GOOGLE_CALLBACK_PATH,		this.authController.authGoogleCallback,
															this.authController.catchInternalError
		);
		
		this.app.get("/oauth2/authorize",					this.authController.isAuthenticated,
															this.authController.authorization,
															this.authController.catchInternalErrorView
		);
		this.app.post("/oauth2/authorize",					this.authController.isAuthenticated,
															this.authController.decision,
															this.authController.catchInternalErrorView
		);
		
		this.app.post("/oauth2/token",						this.authController.isClientAuthenticated,
															this.authController.token,
															this.authController.catchInternalError
		);
		
		//OAuth Client
		
		let OAuthClientController			= require("./controllers/OAuthClientController");
		this.oauthClientController			= new OAuthClientController(booki);
		
		this.PostOAuthClientsValidation		= require("./validation/PostOAuthClientsValidation")(booki);
		
		this.app.post("/oauth2/clients",					this.authController.isAuthenticated,
															this.validate(this.PostOAuthClientsValidation),
															this.oauthClientController.postOAuthClients
		);
		this.app.get("/oauth2/clients",						this.authController.isAuthenticated,
															this.oauthClientController.getOAuthClients
		);
		
		//Books
		
		let BookController				= require("./controllers/BookController");
		this.bookController	 			= new BookController(booki);
		
		
		let UserController				= require("./controllers/UserController");
		this.userController				= new UserController(booki);
	
		this.book_isbn13_id				= require("./validation/book_isbn13_id");
		this.book_post					= require("./validation/book_post");
		
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