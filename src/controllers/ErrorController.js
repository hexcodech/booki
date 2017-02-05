/**
 * Creates the error messages used by this application
 * @constructor
 */

class ErrorController {
	
	constructor({booki, errors, i18n}){
		
		this.errors					= errors;
		this.i18n					= i18n;
		
		//booki.bindAll(this, ["translateError", "expressErrorResponse"]);
		
		//Create errors
		
		this.errorMessages = {
			
			InternalServerError : {
				name				: i18n.__("InternalServerError"),
				code				: 500,
				defaultMessage		: i18n.__("An internal server error occurred"),
				defaultExplanation	: i18n.__("This generally shouldn't happen so yet we don't know what caused it"),
				defaultResponse		: i18n.__("Please contact the support")
			},
			
			
			
			
			BadRequestError : {
				name				: i18n.__("BadRequestError"),
				code				: 400,
				defaultMessage		: i18n.__("Something's wrong with the request"),
			},
			
			InputValidationError : {
				name				: i18n.__("InputValidationError"),
				defaultMessage		: i18n.__("The provided data couldn't be validated"),
			    defaultExplanation	: i18n.__("The data is malformed! Maybe it's in a wrong format or contains unsupported characters"),
			    defaultResponse		: i18n.__("Check if you're input fits the given format"),
			    parent				: "BadRequestError"
			},
			
			
			
			AuthenticationError : {
				name				: i18n.__("AuthenticationError"),
				code				: 401,
				defaultMessage		: i18n.__("Something went wrong with your authentication"),
			},
			
			LoginError : {
				name				: i18n.__("LoginError"),
				defaultMessage		: i18n.__("Your login attempt with the provided credentials failed"),
			    defaultExplanation	: i18n.__("Your email or password was misspelled"),
			    defaultResponse		: i18n.__("Check the entered credentials for typos"),
			    parent				: "AuthenticationError"
			},
			
			PasswordResetCodeInvalidError : {
				name				: i18n.__("PasswordResetCodeInvalidError"),
				defaultMessage		: i18n.__("The entered password reset code is invalid"),
			    defaultResponse		: i18n.__("Check if you copied the whole code"),
			    parent				: "AuthenticationError"
			},
			
			PasswordResetCodeExpiredError : {
				name				: i18n.__("PasswordResetCodeExpiredError"),
				defaultMessage		: i18n.__("The entered password reset code has expired"),
			    defaultResponse		: i18n.__("Start the reset process again"),
			    parent				: "AuthenticationError"
			},
			
			EmailVerificationCodeInvalidError : {
				name				: i18n.__("EmailVerificationCodeInvalidError"),
				defaultMessage		: i18n.__("The entered email verification code is invalid"),
			    defaultResponse		: i18n.__("Check if you copied the whole code"),
			    parent				: "AuthenticationError"
			},
			
			AuthCodeInvalidError : {
				name				: i18n.__("AuthCodeInvalidError"),
				defaultMessage		: i18n.__("Your authentication code is invalid"),
			    defaultResponse		: i18n.__("Check your API calls"),
			    parent				: "AuthenticationError"
			},
			
			AuthCodeExpiredError : {
				name				: i18n.__("AuthCodeExpiredError"),
				defaultMessage		: i18n.__("Your authentication code has expired"),
			    defaultResponse		: i18n.__("Check your API calls"),
			    parent				: "AuthenticationError"
			},
			
			TokenInvalidError : {
				name				: i18n.__("TokenInvalidError"),
				defaultMessage		: i18n.__("Your authentication token is invalid"),
			    defaultResponse		: i18n.__("Try to logout and login again"),
			    parent				: "AuthenticationError"
			},
			
			TokenExpiredError : {
				name				: i18n.__("TokenExpiredError"),
				defaultMessage		: i18n.__("Your authentication token has expired"),
			    defaultExplanation	: i18n.__("You probably haven't used this application for a while so you're token expired"),
			    defaultResponse		: i18n.__("Try to logout and login again"),
			    parent				: "AuthenticationError"
			},
			
			InvalidRedirectUriError : {
				name				: i18n.__("InvalidRedirectUriError"),
				defaultMessage		: i18n.__("The passed redirect uri doesn't match with the ones saved!"),
			    parent				: "AuthenticationError"
			},
			
			
			ForbiddenError : {
				name				: i18n.__("ForbiddenError"),
				code				: 403,
				defaultMessage		: i18n.__("You're not allowed to perform this action"),
			},
			
			
			
			NotFoundError : {
				name				: i18n.__("NotFoundError"),
				code				: 404,
				defaultMessage		: i18n.__("The requested resource couldn't be found"),
				defaultExplanation	: i18n.__("Maybe you mistyped something or the requested resource was deleted"),
			},
			
			
			
			MethodNotFoundError : {
				name				: i18n.__("MethodNotFoundError"),
				code				: 405,
				defaultMessage		: i18n.__("This request isn't supported"),
			},
			
			
			
			RemovedError : {
				name				: i18n.__("RemovedError"),
				code				: 410,
				defaultMessage		: i18n.__("The requested resource was deleted"),
			},
			
			
			
			ClientUpgradeRequiredError : {
				name				: i18n.__("ClientUpgradeRequiredError"),
				code				: 426,
				defaultMessage		: i18n.__("The client software has to be updated in order to use this api in the future"),
			},
			
			
			
			TooManyRequestsError : {
				name				: i18n.__("TooManyRequestsError"),
				code				: 429,
				defaultMessage		: i18n.__("The amount of requests exceeded the limit"),
			},
			
			
			
			CensorshipError : {
				name				: i18n.__("CensorshipError"),
				code				: 451,
				defaultMessage		: i18n.__("The requested couldn't be processed for legal reasons"),
			},
			
			
			GenericError : {
				name				: i18n.__("GenericError"),
				code				: 600,
				defaultMessage		: "",
				defaultResponse		: "",
			},
			
			
			DatabaseError : {
				name				: i18n.__("DatabaseError"),
				code				: 601,
				defaultMessage		: i18n.__("The database query failed"),
				defaultResponse		: i18n.__("This is probably our fault. Please contact the support."),
			},
			
			UnexpectedQueryResultError : {
				name				: i18n.__("UnexpectedQueryResultError"),
				code				: 602,
				defaultMessage		: i18n.__("The database query returned an unexpected result"),
				defaultResponse		: i18n.__("This is probably our fault. Please contact the support."),
				parent				: "DatabaseError"
			},
			
			
			
			RenderError : {
				name				: i18n.__("RenderError"),
				code				: 603,
				defaultMessage		: i18n.__("The data could not be rendered"),
			    defaultResponse		: i18n.__("This is probably our fault. Please contact the support.")
			},
			
			
			UserAlreadyExistsError : {
				name				: i18n.__("UserAlreadyExistsError"),
				code				: 601,
				defaultMessage		: i18n.__("This email was already registered"),
				defaultResponse		: i18n.__("Verify that you still own this email address"),
			}
			
			
		};
		
		let errorKey;
		
		for(errorKey in this.errorMessages){
			if(!this.errorMessages.hasOwnProperty(errorKey)){continue;}
			
			if("parent" in this.errorMessages[errorKey]){
				this.errorMessages[errorKey].parent = this.errors[this.errorMessages[errorKey].parent];
			}
			
			this.errors.create(this.errorMessages[errorKey]);
		}
		
	}
	
	/*translateError(error, locale){
		var message, response, explanation;
		
		if(error.message){
			message = this.i18n.__({phrase: error.message, locale: locale});
		}
		
		if(error.response){
			response = this.i18n.__({phrase: error.response, locale: locale});
		}
		
		if(error.explanation){
			explanation = this.i18n.__({phrase: error.explanation, locale: locale});
		}
		
		let obj = {};
		if(message){obj.message = message};
		if(response){obj.response = response};
		if(explanation){obj.explanation = explanation};
		
		if(error.name in this.errors){
			
			error = new this.errors[error.name](obj);
			
		}else{
			
			error = new this.errors.GenericError(obj);
		}
		
		return error;
	}*/
	
	/*expressErrorResponse(request, response, error, locale){
		return response.end(JSON.stringify(this.translateError(error, locale).toJSON()));
	}*/
	
};

module.exports = ErrorController;