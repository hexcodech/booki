/**
 * Holds the different user functions
 * @constructor
 */

var UserController = function(i18n, errors, mongoose){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.User			= require("../models/User");
	
	this.events			= require("events"); 
	
	this.i18n			= i18n;
	this.errors			= errors;
	this.mongoose		= mongoose;
	this.eventEmitter	= new this.events.EventEmitter();
};

module.exports = UserController;