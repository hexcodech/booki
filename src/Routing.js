/**
 * Manages the REST routing
 */

const Routing = ({booki, app, config, i18n, errorController, mongoose, express_validation}) => {
	
	//Show we're up and running and maybe annoy some people
		
	let ಠ_ಠ = ""; //yes i just did that
	
	booki.fs.readFile(__dirname + "/../static/res/img/easteregg.txt", 'utf8', (err, data) => {
		if(err){
			return console.log(err);
		}
		ಠ_ಠ = data;
	});
	
	app.get("/", (response, request) => {
		request.end(ಠ_ಠ);
	});
	
	
	const validate = (schema) => {
		return express_validation(Object.assign(schema, {
			options:    {
				//true ignores additional fields but doesn't throw an error (quite helpful, as additional fields such as '__v' may get sent)
				allowUnknownBody	: true,
				
				//BUT strictly checking parameters and query arguments. Unknown parameters or querys will throw an error
				allowUnknownParams	: false,
				allowUnknownQuery	: false,
				
				allowUnknownHeaders	: true,
				allowUnknownCookies	: true
			}
		}));
	};
	
	
	
	//Autentication
	
	const authController								= new (require("./controllers/AuthController"))(booki);
	
	
	const localLoginValidation							= require("./validation/LocalLoginValidation")(booki);
	const initPasswordResetValidation					= require("./validation/InitPasswordResetValidation")(booki);
	const passwordResetValidation						= require("./validation/PasswordResetValidation")(booki);
	const localRegistrationValidation					= require("./validation/LocalRegistrationValidation")(booki);
	const verifyMailValidation							= require("./validation/VerifyMailValidation")(booki);
	
	app.get("/views/login",								authController.loginView,
														authController.catchInternalErrorView
	);
	app.get("/views/verify-email",						authController.mailVerificationView,
														authController.catchInternalErrorView
	);
	app.get("/views/password-reset",					authController.passwordResetView,
														authController.catchInternalErrorView
	);
	
	
	
	app.post("/v1/auth/local/login",					validate(localLoginValidation),
														authController.authLocal,
														authController.catchInternalErrorView
	);
	
	app.post("/v1/auth/init-password-reset",			validate(initPasswordResetValidation),
														authController.initPasswordReset,
														authController.catchInternalErrorView
	);
	app.post("/v1/auth/password-reset",					validate(passwordResetValidation),
														authController.passwordReset,
														authController.catchInternalErrorView
	);
	
	app.post("/v1/auth/local/register",					validate(localRegistrationValidation),
														authController.registration,
														authController.catchInternalErrorView
	);
	app.post("/v1/auth/local/verify-email",				validate(verifyMailValidation),
														authController.verifyEmail,
														authController.catchInternalErrorView
	);
	app.get("/v1/auth/facebook/login/",					authController.authFacebook,
														authController.catchInternalError
	);
	app.get(config.FACEBOOK_CALLBACK_PATH,				authController.authFacebookCallback,
														authController.catchInternalError
	);
	
	app.get("/v1/auth/google/login/",					authController.authGoogle,
														authController.catchInternalError
	);
	app.get(config.GOOGLE_CALLBACK_PATH,				authController.authGoogleCallback,
														authController.catchInternalError
	);
	
	app.get("/oauth2/authorize",						authController.isAuthenticated,
														authController.authorization,
														authController.catchInternalErrorView
	);
	app.post("/oauth2/authorize",						authController.isAuthenticated,
														authController.decision,
														authController.catchInternalErrorView
	);
	
	app.post("/oauth2/token",							authController.isClientAuthenticated,
														authController.token,
														authController.catchInternalError
	);
	
	//System
	
	const systemController								= new (require("./controllers/SystemController"))(booki);
	
	app.get("/v1/system/stats",							authController.isBearerAuthenticated(["admin.system.stats"]),
														systemController.getStats
	);
	
	//User
	
	const userController								= new (require("./controllers/UserController"))(booki);
	
	const postUserValidation							= require("./validation/PostUserValidation.js")(booki);
	const putUserValidation								= require("./validation/PutUserValidation.js")(booki);
	
	app.get("/v1/user",									authController.isBearerAuthenticated(["admin.user.list"]),
														userController.getUser
	);
	
	app.get("/v1/user/me",								authController.isBearerAuthenticated(),
														userController.getCurrentUser
	);
	
	app.get("/v1/user/:userId",							authController.isBearerAuthenticated(),
														userController.getUserById
	);
	
	app.post("/v1/user",								authController.isBearerAuthenticated(["admin.user.create"]),
														validate(postUserValidation),
														userController.postUser
	);
	
	app.put("/v1/user/:userId",							authController.isBearerAuthenticated(),
														validate(putUserValidation),
														userController.putUser
	);
	
	app.delete("/v1/user/:userId",						authController.isBearerAuthenticated(["admin.user.delete"]),
														userController.deleteUser
	);
	
	//OAuth Client
	
	const oauthClientController							= new (require("./controllers/OAuthClientController"))(booki);
	
	const postOAuthClientValidation						= require("./validation/PostOAuthClientValidation")(booki);
	const putOAuthClientValidation						= require("./validation/PutOAuthClientValidation")(booki);
	
	
	app.get("/v1/oauth2/client",						authController.isBearerAuthenticated(),
														oauthClientController.getOAuthClient
	);
	
	app.get("/v1/oauth2/client/:clientId",				authController.isBearerAuthenticated(),
														oauthClientController.getOAuthClientById
	);
	
	app.post("/v1/oauth2/client",						authController.isBearerAuthenticated(),
														validate(postOAuthClientValidation),
														oauthClientController.postOAuthClient
	);
	
	app.put("/v1/oauth2/client/:clientId",				authController.isBearerAuthenticated(),
														validate(putOAuthClientValidation),
														oauthClientController.putOAuthClient
	);
	
	app.delete("/v1/oauth2/client/:clientId",			authController.isBearerAuthenticated(),
														oauthClientController.deleteOAuthClient
	);
	
	//Books
	
	const bookController	 							= new (require("./controllers/BookController"))(booki);
	
	const postBookValidation							= require("./validation/PostBookValidation")(booki);
	const putBookValidation								= require("./validation/PutBookValidation")(booki);
	const lookupBookValidation							= require("./validation/LookupBookValidation")(booki);
	
	app.get("/v1/book/lookup",							authController.isBearerAuthenticated(),
														validate(lookupBookValidation),
														bookController.lookupBook
	);
	
	app.get("/v1/book/:bookId",							authController.isBearerAuthenticated(),
														bookController.getBookById
	);
	
	app.get("/v1/book",									authController.isBearerAuthenticated(),
														bookController.getBook
	);
	
	app.post("/v1/book",								authController.isBearerAuthenticated(),
														validate(postBookValidation),
														bookController.postBook
	);
	
	app.put("/v1/book/:bookId",							authController.isBearerAuthenticated(),
														validate(putBookValidation),
														bookController.putBook
	);
	
	app.delete("/v1/book/:bookId",						authController.isBearerAuthenticated(),
														bookController.deleteBook
	);
	
	//last error catch
	
	app.use((error, request, response, next) => {
		if(error){
			
			//TODO: translate the error
			console.log(error);
			response.json(error.toJSON());
			response.end();
		}
		
		next();
	});
};

module.exports = Routing;