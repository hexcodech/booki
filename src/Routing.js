/**
 * Manages the REST routing
 */

const Routing = ({ booki, app, config, logger, i18n, piwikTracker }) => {
	const express_validation = require("express-validation");
	const fs = require("fs");

	//Show we're up and running

	let easteregg = "";

	fs.readFile(
		__dirname + "/../static/res/easteregg.txt",
		"utf8",
		(err, data) => {
			if (err) {
				return console.log(err);
			}

			easteregg = data;
		}
	);

	app.get("/", (request, response) => {
		response.end(easteregg);
	});

	const validate = schema => {
		return express_validation(
			Object.assign(schema, {
				options: {
					//true ignores additional fields but doesn't throw an error
					allowUnknownBody: true,

					//but strictly checking parameters and query arguments.
					//Unknown parameters or querys will throw an error
					allowUnknownParams: false,
					allowUnknownQuery: false,

					allowUnknownHeaders: true,
					allowUnknownCookies: true
				}
			})
		);
	};

	//enables unauthenticated users without throwing an error on
	//'request.user.hasPermission' if 'request.user' is undefined
	app.use((request, response, next) => {
		request.hasPermissions = permissions => {
			return request.user && request.user.doesHavePermissions(permissions);
		};

		request.hasPermission = permission => {
			return request.user && request.user.doesHavePermission(permission);
		};

		request.getLocale = (user = request.user) => {
			if (user && user.get) {
				return user.get("locale");
			} else if (request !== null) {
				return i18n.getLocale(request);
			} else {
				return config.LOCALES[0];
			}
		};

		next();
	});

	//Authentication

	const authController = new (require("./controllers/AuthController"))(booki);

	//TODO Modularize

	const localLoginValidation = require("./validation/authentication/LocalLoginValidation")(
		booki
	);

	const initPasswordResetValidation = require("./validation/authentication/InitPasswordResetValidation")(
		booki
	);

	const passwordResetValidation = require("./validation/authentication/PasswordResetValidation")(
		booki
	);

	const localRegistrationValidation = require("./validation/authentication/LocalRegistrationValidation")(
		booki
	);

	const verifyMailValidation = require("./validation/authentication/VerifyMailValidation")(
		booki
	);

	app.get(
		"/v1/auth/logged-in",
		authController.isBearerAuthenticated(),
		(request, response, next) => {
			return response.end('{"loggedIn": true}');
		},
		(error, request, response, next) => {
			response.end('{"loggedIn": false}');
		}
	);

	app.get(
		"/views/login",
		authController.loginView, //Tracked in analytics
		authController.catchInternalErrorView
	);
	app.get(
		"/views/verify-email",
		authController.mailVerificationView, //Tracked in analytics
		authController.catchInternalErrorView
	);
	app.get(
		"/views/password-reset",
		authController.passwordResetView, //Tracked in analytics
		authController.catchInternalErrorView
	);

	app.post(
		"/v1/auth/local/login",
		validate(localLoginValidation), //Tracked in analytics
		authController.authLocal,
		authController.catchInternalErrorView
	);

	app.post(
		"/v1/auth/init-password-reset",
		validate(initPasswordResetValidation),
		authController.initPasswordReset,
		authController.catchInternalErrorView
	);
	app.post(
		"/v1/auth/password-reset",
		validate(passwordResetValidation),
		authController.passwordReset, //Tracked in analytics
		authController.catchInternalErrorView
	);

	app.post(
		"/v1/auth/local/register",
		validate(localRegistrationValidation),
		authController.registration, //Tracked in analytics
		authController.catchInternalErrorView
	);
	app.post(
		"/v1/auth/local/verify-email",
		validate(verifyMailValidation),
		authController.verifyEmail, //Tracked in analytics
		authController.catchInternalErrorView
	);
	app.get(
		"/v1/auth/facebook/login/",
		authController.authFacebook,
		authController.catchInternalError
	);
	app.get(
		config.FACEBOOK_CALLBACK_PATH,
		authController.authFacebookCallback, //Tracked in analytics
		authController.catchInternalError
	);

	app.get(
		"/v1/auth/google/login/",
		authController.authGoogle,
		authController.catchInternalError
	);
	app.get(
		config.GOOGLE_CALLBACK_PATH,
		authController.authGoogleCallback, //Tracked in analytics
		authController.catchInternalError
	);

	app.get(
		"/oauth2/authorize",
		authController.isAuthenticated,
		authController.authorization,
		authController.catchInternalErrorView
	);
	app.post(
		"/oauth2/authorize",
		authController.isAuthenticated,
		authController.decision,
		authController.catchInternalErrorView
	);

	app.post(
		"/oauth2/token",
		authController.isClientAuthenticated,
		authController.token,
		authController.catchInternalError
	);

	//System

	const systemController = new (require("./controllers/SystemController"))(
		booki
	);

	const getCleanup = require("./validation/system/GetCleanup.js")(booki);

	app.get(
		"/v1/system/stats",
		authController.isBearerAuthenticated(["admin.system.stats"]),
		systemController.getStats
	);

	app.get(
		"/v1/system/cleanup",
		authController.isBearerAuthenticated(["admin.system.cleanup"]),
		validate(getCleanup),
		systemController.cleanup
	);

	//User

	const userController = new (require("./controllers/UserController"))(booki);

	const getUserByIdValidation = require("./validation/user/GetUserByIdValidation.js")(
		booki
	);
	const postUserValidation = require("./validation/user/PostUserValidation.js")(
		booki
	);
	const putUserValidation = require("./validation/user/PutUserValidation.js")(
		booki
	);
	const deleteUserValidation = require("./validation/user/DeleteUserValidation.js")(
		booki
	);

	app.get(
		"/v1/user",
		authController.isBearerAuthenticated(["admin.user.list"]),
		userController.getUser
	);

	app.get(
		"/v1/user/me",
		authController.isBearerAuthenticated(),
		userController.getCurrentUser
	);

	app.get(
		"/v1/user/:userId",
		validate(getUserByIdValidation),
		userController.getUserById
	);

	app.post(
		"/v1/user",
		authController.isBearerAuthenticated(["admin.user.create"]),
		validate(postUserValidation),
		userController.postUser
	);

	app.put(
		"/v1/user/:userId",
		authController.isBearerAuthenticated(),
		validate(putUserValidation),
		userController.putUser
	);

	app.delete(
		"/v1/user/:userId",
		authController.isBearerAuthenticated(["admin.user.delete"]),
		validate(deleteUserValidation),
		userController.deleteUser
	);

	//OAuth Client

	const oauthClientController = new (require("./controllers/OAuthClientController"))(
		booki
	);

	const postOAuthClientValidation = require("./validation/oauth-client/PostOAuthClientValidation")(
		booki
	);

	const putOAuthClientValidation = require("./validation/oauth-client/PutOAuthClientValidation")(
		booki
	);

	const deleteOAuthClientValidation = require("./validation/oauth-client/DeleteOAuthClientValidation")(
		booki
	);

	app.get(
		"/v1/oauth2/client",
		authController.isBearerAuthenticated(),
		oauthClientController.getOAuthClient
	);

	app.get(
		"/v1/oauth2/client/:clientId",
		authController.isBearerAuthenticated(),
		oauthClientController.getOAuthClientById
	);

	app.post(
		"/v1/oauth2/client",
		authController.isBearerAuthenticated(),
		validate(postOAuthClientValidation),
		oauthClientController.postOAuthClient
	);

	app.put(
		"/v1/oauth2/client/:clientId",
		authController.isBearerAuthenticated(),
		validate(putOAuthClientValidation),
		oauthClientController.putOAuthClient
	);

	app.delete(
		"/v1/oauth2/client/:clientId",
		authController.isBearerAuthenticated(),
		validate(deleteOAuthClientValidation),
		oauthClientController.deleteOAuthClient
	);

	//People

	const personController = new (require("./controllers/PersonController"))(
		booki
	);

	const getPersonByIdValidation = require("./validation/person/GetPersonByIdValidation")(
		booki
	);
	const postPersonValidation = require("./validation/person/PostPersonValidation")(
		booki
	);
	const putPersonValidation = require("./validation/person/PutPersonValidation")(
		booki
	);
	const deletePersonValidation = require("./validation/person/DeletePersonValidation")(
		booki
	);
	const lookupPersonValidation = require("./validation/person/LookupPersonValidation")(
		booki
	);

	app.get(
		"/v1/person",
		authController.isBearerAuthenticated(["admin.person.list"]),
		personController.getPerson
	);

	app.get(
		"/v1/person/lookup",
		authController.isBearerAuthenticated(),
		validate(lookupPersonValidation),
		personController.lookupPerson
	);

	app.get(
		"/v1/person/:personId",
		authController.isBearerAuthenticated(["admin.person.get"]),
		validate(getPersonByIdValidation),
		personController.getPersonById
	);

	app.post(
		"/v1/person",
		authController.isBearerAuthenticated(["admin.person.create"]),
		validate(postPersonValidation),
		personController.postPerson
	);

	app.put(
		"/v1/person/:personId",
		authController.isBearerAuthenticated(["admin.person.udate"]),
		validate(putPersonValidation),
		personController.putPerson
	);

	app.delete(
		"/v1/person/:personId",
		authController.isBearerAuthenticated(["admin.person.delete"]),
		validate(deletePersonValidation),
		personController.deletePerson
	);

	//ThumbnailType

	const thumbnailTypeController = new (require("./controllers/ThumbnailTypeController"))(
		booki
	);

	const getThumbnailTypeByIdValidation = require("./validation/thumbnail-type/GetThumbnailTypeByIdValidation")(
		booki
	);
	const postThumbnailTypeValidation = require("./validation/thumbnail-type/PostThumbnailTypeValidation")(
		booki
	);
	const putThumbnailTypeValidation = require("./validation/thumbnail-type/PutThumbnailTypeValidation")(
		booki
	);
	const deleteThumbnailTypeValidation = require("./validation/thumbnail-type/DeleteThumbnailTypeValidation")(
		booki
	);

	app.get(
		"/v1/thumbnail-type",
		authController.isBearerAuthenticated(["admin.thumbnailType.list"]),
		thumbnailTypeController.getThumbnailType
	);

	app.get(
		"/v1/thumbnail-type/:thumbnailTypeId",
		authController.isBearerAuthenticated(["admin.thumbnailType.get"]),
		validate(getThumbnailTypeByIdValidation),
		thumbnailTypeController.getThumbnailTypeById
	);

	app.post(
		"/v1/thumbnail-type",
		authController.isBearerAuthenticated(["admin.thumbnailType.create"]),
		validate(postThumbnailTypeValidation),
		thumbnailTypeController.postThumbnailType
	);

	app.put(
		"/v1/thumbnail-type/:thumbnailTypeId",
		authController.isBearerAuthenticated(["admin.thumbnailType.udate"]),
		validate(putThumbnailTypeValidation),
		thumbnailTypeController.putThumbnailType
	);

	app.delete(
		"/v1/thumbnail-type/:thumbnailTypeId",
		authController.isBearerAuthenticated(["admin.thumbnailType.delete"]),
		validate(deleteThumbnailTypeValidation),
		thumbnailTypeController.deleteThumbnailType
	);

	//Images

	const imageController = new (require("./controllers/ImageController"))(booki);

	const postImageValidation = require("./validation/image/PostImageValidation")(
		booki
	);
	const putImageValidation = require("./validation/image/PutImageValidation")(
		booki
	);
	const deleteImageValidation = require("./validation/image/DeleteImageValidation")(
		booki
	);

	app.get(
		"/v1/image",
		authController.isBearerAuthenticated(["admin.image.list"]),
		imageController.getImage
	);

	app.post(
		"/v1/image",
		authController.isBearerAuthenticated(),
		validate(postImageValidation),
		imageController.postImage
	);

	app.put(
		"/v1/image/:imageId",
		authController.isBearerAuthenticated(),
		validate(putImageValidation),
		imageController.putImage
	);

	app.delete(
		"/v1/image/:imageId",
		authController.isBearerAuthenticated(),
		validate(deleteImageValidation),
		imageController.deleteImage
	);

	//Books

	const bookController = new (require("./controllers/BookController"))(booki);

	const getBookValidation = require("./validation/book/GetBookValidation")(
		booki
	);

	const getBookByIdValidation = require("./validation/book/GetBookByIdValidation")(
		booki
	);
	const postBookValidation = require("./validation/book/PostBookValidation")(
		booki
	);
	const putBookValidation = require("./validation/book/PutBookValidation")(
		booki
	);
	const lookupBookValidation = require("./validation/book/LookupBookValidation")(
		booki
	);
	const deleteBookValidation = require("./validation/book/DeleteBookValidation")(
		booki
	);

	app.get(
		"/v1/book/lookup/external",
		authController.isBearerAuthenticated(),
		validate(lookupBookValidation),
		bookController.lookupExternalBook
	);

	app.get(
		"/v1/book/lookup",
		validate(lookupBookValidation),
		bookController.lookupBook
	);

	app.get(
		"/v1/book/:bookId",
		validate(getBookByIdValidation),
		bookController.getBookById
	);

	app.get("/v1/book", validate(getBookValidation), bookController.getBook);

	app.post(
		"/v1/book",
		authController.isBearerAuthenticated(),
		validate(postBookValidation),
		bookController.postBook
	);

	app.put(
		"/v1/book/:bookId",
		authController.isBearerAuthenticated(),
		validate(putBookValidation),
		bookController.putBook
	);

	app.delete(
		"/v1/book/:bookId",
		authController.isBearerAuthenticated(["admin.book.delete"]),
		validate(deleteBookValidation),
		bookController.deleteBook
	);

	//Conditions

	const conditionController = new (require("./controllers/ConditionController"))(
		booki
	);

	const getConditionByIdValidation = require("./validation/condition/GetConditionByIdValidation")(
		booki
	);
	const postConditionValidation = require("./validation/condition/PostConditionValidation")(
		booki
	);
	const putConditionValidation = require("./validation/condition/PutConditionValidation")(
		booki
	);
	const deleteConditionValidation = require("./validation/condition/DeleteConditionValidation")(
		booki
	);

	app.get("/v1/condition", conditionController.getCondition);

	app.get(
		"/v1/condition/:conditionId",
		authController.isBearerAuthenticated(["admin.condition.get"]),
		validate(getConditionByIdValidation),
		conditionController.getConditionById
	);

	app.post(
		"/v1/condition",
		authController.isBearerAuthenticated(["admin.condition.create"]),
		validate(postConditionValidation),
		conditionController.postCondition
	);

	app.put(
		"/v1/condition/:conditionId",
		authController.isBearerAuthenticated(["admin.condition.udate"]),
		validate(putConditionValidation),
		conditionController.putCondition
	);

	app.delete(
		"/v1/condition/:conditionId",
		authController.isBearerAuthenticated(["admin.condition.delete"]),
		validate(deleteConditionValidation),
		conditionController.deleteCondition
	);

	//Offers

	const offerController = new (require("./controllers/OfferController"))(booki);

	const getOfferByIdValidation = require("./validation/offer/GetOfferByIdValidation")(
		booki
	);
	const getOfferByBookIdValidation = require("./validation/offer/GetOfferByBookIdValidation")(
		booki
	);
	const postOfferValidation = require("./validation/offer/PostOfferValidation")(
		booki
	);
	const putOfferValidation = require("./validation/offer/PutOfferValidation")(
		booki
	);
	const deleteOfferValidation = require("./validation/offer/DeleteOfferValidation")(
		booki
	);

	app.get(
		"/v1/offer",
		authController.isBearerAuthenticated(),
		offerController.getOffer
	);

	app.get(
		"/v1/offer/:offerId",
		authController.isBearerAuthenticated(),
		validate(getOfferByIdValidation),
		offerController.getOfferById
	);

	app.get(
		"/v1/offer/:bookId",
		authController.isBearerAuthenticated(),
		validate(getOfferByBookIdValidation),
		offerController.getOfferByBookId
	);

	app.post(
		"/v1/offer",
		authController.isBearerAuthenticated(),
		validate(postOfferValidation),
		offerController.postOffer
	);

	app.put(
		"/v1/offer/:offerId",
		authController.isBearerAuthenticated(),
		validate(putOfferValidation),
		offerController.putOffer
	);

	app.delete(
		"/v1/offer/:offerId",
		authController.isBearerAuthenticated(),
		validate(deleteOfferValidation),
		offerController.deleteOffer
	);

	//OfferRequest

	const offerRequestController = new (require("./controllers/OfferRequestController"))(
		booki
	);

	const getOfferRequestByIdValidation = require("./validation/offer-request/GetOfferRequestByIdValidation")(
		booki
	);
	const postOfferRequestValidation = require("./validation/offer-request/PostOfferRequestValidation")(
		booki
	);
	const putOfferRequestValidation = require("./validation/offer-request/PutOfferRequestValidation")(
		booki
	);
	const deleteOfferRequestValidation = require("./validation/offer-request/DeleteOfferRequestValidation")(
		booki
	);
	const respondToOfferRequestValidation = require("./validation/offer-request/RespondToOfferRequestValidation");

	app.get(
		"/v1/offer-request",
		authController.isBearerAuthenticated(["admin.offerRequest.list"]),
		offerRequestController.getOfferRequest
	);

	app.get(
		"/v1/offer-request/:offerRequestId/respond",
		validate(respondToOfferRequestValidation),
		offerRequestController.respondToOfferRequest
	);

	app.get(
		"/v1/offer-request/:offerRequestId",
		authController.isBearerAuthenticated(["admin.offerRequest.get"]),
		validate(getOfferRequestByIdValidation),
		offerRequestController.getOfferRequestById
	);

	app.post(
		"/v1/offer-request",
		validate(postOfferRequestValidation),
		offerRequestController.postOfferRequest
	);

	app.put(
		"/v1/offer-request/:offerRequestId",
		authController.isBearerAuthenticated(["admin.offerRequest.update"]),
		validate(putOfferRequestValidation),
		offerRequestController.putOfferRequest
	);

	app.delete(
		"/v1/offer-request/:offerRequestId",
		authController.isBearerAuthenticated(["admin.offerRequest.delete"]),
		validate(deleteOfferRequestValidation),
		offerRequestController.deleteOfferRequest
	);

	//last error catch

	app.use((error, request, response, next) => {
		if (error) {
			logger.log("error", error);

			error.name = request.__(error.name);
			error.message = request.__(error.message);

			response.status(500);
			if (error.message === "validation error") {
				response.json(error);
			} else {
				response.json({
					name: error.name,
					message: error.message,
					status: 500
				});
			}
			response.end();
		}

		next();
	});
};

module.exports = Routing;
