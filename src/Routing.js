/**
 * Manages the REST routing
 */

const Routing = ({booki, app, config, i18n, errorController, mongoose, validate}) => {
	
	//Show we're up and running and maybe annoy some people
		
	let troll = "";
	
	booki.fs.readFile(__dirname + "/../static/res/img/trollface.txt", 'utf8', (err, data) => {
		if(err){
			return console.log(err);
		}
		troll = data;
	});
	
	app.get("/", (response, request) => {
		request.end(troll);
	});
	
	
	
	//Autentication
	
	const authController								= new (require("./controllers/AuthController"))(booki);
	
	
	const LocalLoginValidation							= require("./validation/LocalLoginValidation")(booki);
	const InitPasswordResetValidation					= require("./validation/InitPasswordResetValidation")(booki);
	const PasswordResetValidation						= require("./validation/PasswordResetValidation")(booki);
	const LocalRegistrationValidation					= require("./validation/LocalRegistrationValidation")(booki);
	const VerifyMailValidation							= require("./validation/VerifyMailValidation")(booki);
	
	app.get("/views/login",								authController.loginView,
														authController.catchInternalErrorView
	);
	app.get("/views/verify-email",						authController.mailVerificationView,
														authController.catchInternalErrorView
	);
	app.get("/views/password-reset",					authController.passwordResetView,
														authController.catchInternalErrorView
	);
	
	
	
	app.post("/v1/auth/local/login",					validate(LocalLoginValidation),
														authController.authLocal,
														authController.catchInternalErrorView
	);
	
	app.post("/v1/auth/init-password-reset",			validate(InitPasswordResetValidation),
														authController.initPasswordReset,
														authController.catchInternalErrorView
	);
	app.post("/v1/auth/password-reset",					validate(PasswordResetValidation),
														authController.passwordReset,
														authController.catchInternalErrorView
	);
	
	app.post("/v1/auth/local/register",					validate(LocalRegistrationValidation),
														authController.registration,
														authController.catchInternalErrorView
	);
	app.post("/v1/auth/local/verify-email",				validate(VerifyMailValidation),
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
	
	app.get("/v1/system/stats",							authController.isBearerAuthenticated(["access-system-stats"]),
														systemController.getStats
	);
	
	//User
	
	const userController								= new (require("./controllers/UserController"))(booki);
	
	const UserValidation								= require("./validation/UserValidation.js")(booki);
	
	app.get("/v1/user",									authController.isBearerAuthenticated(["list-users"]),
														userController.getUser
	);
	
	app.get("/v1/user/me",								authController.isBearerAuthenticated(),
														userController.getCurrentUser
	);
	
	app.get("/v1/user/:userId",							authController.isBearerAuthenticated(),
														userController.getUserById
	);
	
	app.post("/v1/user",								authController.isBearerAuthenticated(["create-users"]),
														validate(UserValidation),
														userController.postUser
	);
	
	app.put("/v1/user/:userId",							authController.isBearerAuthenticated(),
														validate(UserValidation),
														userController.putUser
	);
	
	app.delete("/v1/user/:userId",						authController.isBearerAuthenticated(["delete-users"]),
														userController.deleteUser
	);
	
	//OAuth Client
	
	const oauthClientController							= new (require("./controllers/OAuthClientController"))(booki);
	
	const postOAuthClientValidation						= require("./validation/postOAuthClientValidation")(booki);
	const putOAuthClientValidation						= require("./validation/putOAuthClientValidation")(booki);
	
	
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
	
	const bookController	 								= new (require("./controllers/BookController"))(booki);						
														
	const book_isbn13_id									= require("./validation/book_isbn13_id");
	const book_post										= require("./validation/book_post");
	
	
	//Labels
	
	/*app.get("/v1/label",							authController.isBearerAuthenticated(),
		(request, response) => {
			
			let labelsToGet = {
				user: userController.User,
			};
			
			let labels = {};
			let allLabels = request.user.hasCapability("access-raw-data");
			
			for(let key in labelsToGet){
				
				if(!labelsToGet.hasOwnProperty(key)){continue;}
				
				labels[key] = labelsToGet[key].getLabels({
					allLabels: allLabels
				});
			}
			
			response.json(labels);
			response.end();
															
		}
	);*/
	
	
	//last error catch
	
	app.use((error, request, response, next) => {
		if(error){
			
			//TODO: translate the error
			response.json(error.toJSON());
			response.end();
		}
		
		next();
	});
};

module.exports = Routing;