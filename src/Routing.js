/**
 * Manages the REST routing
 */

const Routing = ({booki, app, config, logger}) => {

	const express_validation = require('express-validation');
	const fs                 = require('fs');

	//Show we're up and running

	let easteregg = '';

	fs.readFile(__dirname + '/../static/res/easteregg.txt', 'utf8',
	(err, data) => {

		if(err){
			return console.log(err);
		}

		easteregg = data;
	});

	app.get('/', (response, request) => {
		request.end(easteregg);
	});


	const validate = (schema) => {
		return express_validation(Object.assign(schema, {
			options:    {
				//true ignores additional fields but doesn't throw an error
				allowUnknownBody		: true,

				//but strictly checking parameters and query arguments.
				//Unknown parameters or querys will throw an error
				allowUnknownParams	: false,
				allowUnknownQuery		: false,

				allowUnknownHeaders	: true,
				allowUnknownCookies	: true
			}
		}));
	};



	//Autentication

	const authController = new (require('./controllers/AuthController'))(booki);


	//enables unauthenticated users without throwing an error on
	//'request.user.hasPermission' if 'request.user' is undefined
	app.use((request, response, next) => {

		request.hasPermissions = (permissions) => {
			return request.user && request.user.doesHavePermissions(permissions);
		};

		request.hasPermission = (permission) => {
			return request.user && request.user.doesHavePermission(permission);
		};

		request.getLocale = (user = request.user) => {
			if(user !== null){
				return user.get('locale');
			}else if(request !== null){
				return i18n.getLocale(request);
			}else{
				return config.LOCALES[0]
			}
		};

		next();
	});

	const localLoginValidation = require(
		'./validation/authentication/LocalLoginValidation'
	)(booki);

	const initPasswordResetValidation	= require(
		'./validation/authentication/InitPasswordResetValidation'
	)(booki);

	const passwordResetValidation = require(
		'./validation/authentication/PasswordResetValidation'
	)(booki);

	const localRegistrationValidation	= require(
		'./validation/authentication/LocalRegistrationValidation'
	)(booki);

	const verifyMailValidation = require(
		'./validation/authentication/VerifyMailValidation'
	)(booki);

	app.get('/views/login',
		authController.loginView,
		authController.catchInternalErrorView
	);
	app.get('/views/verify-email',
		authController.mailVerificationView,
		authController.catchInternalErrorView
	);
	app.get('/views/password-reset',
		authController.passwordResetView,
		authController.catchInternalErrorView
	);



	app.post('/v1/auth/local/login',
		validate(localLoginValidation),
		authController.authLocal,
		authController.catchInternalErrorView
	);

	app.post('/v1/auth/init-password-reset',
		validate(initPasswordResetValidation),
		authController.initPasswordReset,
		authController.catchInternalErrorView
	);
	app.post('/v1/auth/password-reset',
		validate(passwordResetValidation),
		authController.passwordReset,
		authController.catchInternalErrorView
	);

	app.post('/v1/auth/local/register',
		validate(localRegistrationValidation),
		authController.registration,
		authController.catchInternalErrorView
	);
	app.post('/v1/auth/local/verify-email',
		validate(verifyMailValidation),
		authController.verifyEmail,
		authController.catchInternalErrorView
	);
	app.get('/v1/auth/facebook/login/',
		authController.authFacebook,
		authController.catchInternalError
	);
	app.get(config.FACEBOOK_CALLBACK_PATH,
		authController.authFacebookCallback,
		authController.catchInternalError
	);

	app.get('/v1/auth/google/login/',
		authController.authGoogle,
		authController.catchInternalError
	);
	app.get(config.GOOGLE_CALLBACK_PATH,
		authController.authGoogleCallback,
		authController.catchInternalError
	);

	app.get('/oauth2/authorize',
		authController.isAuthenticated,
		authController.authorization,
		authController.catchInternalErrorView
	);
	app.post('/oauth2/authorize',
		authController.isAuthenticated,
		authController.decision,
		authController.catchInternalErrorView
	);

	app.post('/oauth2/token',
		authController.isClientAuthenticated,
		authController.token,
		authController.catchInternalError
	);

	//System

	const systemController = new (require(
		'./controllers/SystemController')
	)(booki);

	app.get('/v1/system/stats',
		authController.isBearerAuthenticated(['admin.system.stats']),
		systemController.getStats
	);

	//User

	const userController               = new (require(
		'./controllers/UserController')
	)(booki);

	const postUserValidation           = require(
		'./validation/user/PostUserValidation.js'
	)(booki);
	const putUserValidation            = require(
		'./validation/user/PutUserValidation.js'
	)(booki);

	app.get('/v1/user',
		authController.isBearerAuthenticated(['admin.user.list']),
		userController.getUser
	);

	app.get('/v1/user/me',
		authController.isBearerAuthenticated(),
		userController.getCurrentUser
	);

	app.get('/v1/user/:userId',
		userController.getUserById
	);

	app.post('/v1/user',
		authController.isBearerAuthenticated(['admin.user.create']),
		validate(postUserValidation),
		userController.postUser
	);

	app.put('/v1/user/:userId',
		authController.isBearerAuthenticated(),
		validate(putUserValidation),
		userController.putUser
	);

	app.delete('/v1/user/:userId',
		authController.isBearerAuthenticated(['admin.user.delete']),
		userController.deleteUser
	);

	//OAuth Client

	const oauthClientController	= new (require(
		'./controllers/OAuthClientController'
	))(booki);


	const postOAuthClientValidation = require(
		'./validation/oauth-client/PostOAuthClientValidation'
	)(booki);

	const putOAuthClientValidation = require(
		'./validation/oauth-client/PutOAuthClientValidation'
	)(booki);


	app.get('/v1/oauth2/client',
		authController.isBearerAuthenticated(),
		oauthClientController.getOAuthClient
	);

	app.get('/v1/oauth2/client/:clientId',
		authController.isBearerAuthenticated(),
		oauthClientController.getOAuthClientById
	);

	app.post('/v1/oauth2/client',
		authController.isBearerAuthenticated(),
		validate(postOAuthClientValidation),
		oauthClientController.postOAuthClient
	);

	app.put('/v1/oauth2/client/:clientId',
		authController.isBearerAuthenticated(),
		validate(putOAuthClientValidation),
		oauthClientController.putOAuthClient
	);

	app.delete('/v1/oauth2/client/:clientId',
		authController.isBearerAuthenticated(),
		oauthClientController.deleteOAuthClient
	);

	//Books

	const bookController = new (require(
		'./controllers/BookController'
	))(booki);

	const postBookValidation = require(
		'./validation/book/PostBookValidation'
	)(booki);
	const putBookValidation = require(
		'./validation/book/PutBookValidation'
	)(booki);
	const lookupBookValidation = require(
		'./validation/book/LookupBookValidation'
	)(booki);

	app.get('/v1/book/lookup',
		validate(lookupBookValidation),
		bookController.lookupBook
	);

	app.get('/v1/book/:bookId',
		bookController.getBookById
	);

	app.get('/v1/book',
		bookController.getBook
	);

	app.post('/v1/book',
		authController.isBearerAuthenticated(),
		validate(postBookValidation),
		bookController.postBook
	);

	app.put('/v1/book/:bookId',
		authController.isBearerAuthenticated(),
		validate(putBookValidation),
		bookController.putBook
	);

	app.delete('/v1/book/:bookId',
		authController.isBearerAuthenticated(['admin.book.delete']),
		bookController.deleteBook
	);

	//People

	const personController = new (require(
		'./controllers/PersonController'
	))(booki);

	const lookupPersonValidation = require(
		'./validation/person/LookupPersonValidation'
	)(booki);

	app.get('/v1/person/lookup',
		validate(lookupPersonValidation),
		personController.lookupPerson
	);

	//last error catch

	app.use((error, request, response, next) => {
		if(error){

			//TODO: translate the error
			logger.log('error', error);
			response.json(error);
			response.end();
		}

		next();
	});
};

module.exports = Routing;
