/**
 * Creates the error messages used by this application
 * @constructor
 */

var Error = function(i18n){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.errors			= require("errors");
	
	//init variables
	this.i18n			= i18n;
	
	//Create erros
	
	this.errors.create({
		name				: i18n.__("InternalServerError"),
		code				: 500,
		defaultMessage		: i18n.__("An internal server error occurred"),
		defaultExplanation	: i18n.__("This generally shouldn't happen so yet we don't know what caused it"),
		defaultResponse		: i18n.__("Please contact the support")
	});
	
	this.errors.create({
		name				: i18n.__("BadRequestError"),
		code				: 400,
		defaultMessage		: i18n.__("Something's wrong with the request"),
	});
	
		this.errors.create({
			name				: i18n.__("InputValidationError"),
			defaultMessage		: i18n.__("The provided data couldn't be validated"),
		    defaultExplanation	: i18n.__("The data is malformed! Maybe it's in a wrong format or contains unsupported characters"),
		    defaultResponse		: i18n.__("Check if you're input fits the given format"),
		    parent				: this.errors.BadRequestError
		});
	
	this.errors.create({
		name				: i18n.__("AuthenticationError"),
		code				: 401,
		defaultMessage		: i18n.__("Something went wrong with the authentication"),
	});
	
		this.errors.create({
			name				: i18n.__("LoginError"),
			defaultMessage		: i18n.__("Your login attempt with the provided credentials failed"),
		    defaultExplanation	: i18n.__("Your email or password was misspelled"),
		    defaultResponse		: i18n.__("Check the entered credentials for typos"),
		    parent				: this.errors.AuthenticationError
		});
		
		this.errors.create({
			name				: i18n.__("TokenExpiredError"),
			defaultMessage		: i18n.__("Your authentication token has expired"),
		    defaultExplanation	: i18n.__("You haven't used this application for a while so you're token expired"),
		    defaultResponse		: i18n.__("Return to the login page and enter your credentials"),
		    parent				: this.errors.AuthenticationError
		});
		
	this.errors.create({
		name				: i18n.__("ForbiddenError"),
		code				: 403,
		defaultMessage		: i18n.__("You're not allowed to perform this action"),
	});
	
	this.errors.create({
		name				: i18n.__("NotFoundError"),
		code				: 404,
		defaultMessage		: i18n.__("The requested resource couldn't be found"),
		defaultExplanation	: i18n.__("Maybe you mistyped something or the requested resource was deleted"),
	});
	
	this.errors.create({
		name				: i18n.__("MethodNotFoundError"),
		code				: 405,
		defaultMessage		: i18n.__("This request isn't supported"),
	});
	
	this.errors.create({
		name				: i18n.__("RemovedError"),
		code				: 410,
		defaultMessage		: i18n.__("The requested resource was deleted"),
	});
	
	this.errors.create({
		name				: i18n.__("ClientUpgradeRequiredLow"),
		code				: 426,
		defaultMessage		: i18n.__("The client software has to be updated in order to use this api in the future"),
	});
	
	this.errors.create({
		name				: i18n.__("TooManyRequestsLow"),
		code				: 429,
		defaultMessage		: i18n.__("The amount of requests exceeded the limit"),
	});
	
	this.errors.create({
		name				: i18n.__("CensorshipError"),
		code				: 451,
		defaultMessage		: i18n.__("The requested couldn't be processed for legal reasons"),
	});
	
	this.errors.create({
		name				: i18n.__("DatabaseError"),
		code				: 601,
		defaultMessage		: i18n.__("The database query failed"),
	});
	
		this.errors.create({
			name				: i18n.__("UnexpectedQueryResultError"),
			code				: 602,
			defaultMessage		: i18n.__("The database query returned an unexpected result"),
			parent				: this.errors.DatabaseError
		});
};

Error.prototype.getErrorsObject = function(){
	return this.errors;
}

module.exports = Error;