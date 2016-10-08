/**
 * Handles all API calls on /book/
 * @param booki
 * @constructor
 */

var BookController = function(app, i18n, errors, mongoose){
	
	var self			= this;
	
	//Store passed parameters
	self.app			= app;
	self.i18n			= i18n;
	self.errors			= errors;
	self.mongoose		= mongoose;
	
    //Require modules
    //this.Book			= require("../models/Book")(this.i18n, this.mongoose);

	self.events			= require("events");

    //init values
	self.eventEmitter	= new self.events.EventEmitter();
};

module.exports = BookController;