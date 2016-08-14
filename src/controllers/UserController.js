/**
 * Holds the different user functions
 * @constructor
 */

var UserController = function(i18n, sqlConnection){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.User			= require("../models/User");
	
	this.events			= require("events");
	this.sql			= require("mysql"); 
	
	this.i18n			= i18n;
	this.sqlConnection	= sqlConnection;
	this.eventEmitter	= new this.events.EventEmitter();
};

UserController.prototype.selectUserID = function (id, callback) {
	this.sqlConnection.query("SELECT * FROM users WHERE id=1", function (err, results) {
		if(err){
			throw err;
		}
		
		return results;
     });
 };

module.exports = UserController;