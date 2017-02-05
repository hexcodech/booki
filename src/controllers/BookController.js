/**
 * Handles all API calls on /book/
 * @param booki
 * @constructor
 */

var BookController = function({booki, i18n, errorController, mongoose}){
	
	var self			= this;
	
	//Store passed parameters
	self.i18n				= i18n;
	self.errorController	= errorController;
	self.mongoose			= mongoose;
	
	booki.bindAll(this, []);
	
    //Require modules
};

module.exports = BookController;