/**
 * Holds the different user functions
 * @constructor
 */

var UserController = function(i18n, errors, sqlConnection){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.User			= require("../models/User");
	
	this.events			= require("events");
	this.sql			= require("mysql"); 
	
	this.i18n			= i18n;
	this.errors			= errors;
	this.sqlConnection	= sqlConnection;
	this.eventEmitter	= new this.events.EventEmitter();
};

UserController.prototype.get = function (userData, callback){
	var self	= this;
	
	var userDataDefaults = {
			id:				null,
			mail:			null
	};
	
	var query	= "SELECT * FROM users WHERE 1=1";
	var params	= [];
	
	userData = Object.assign(userDataDefaults, userData);
	
	for(var key in userData){
		if(userData.hasOwnProperty(key)) {
			
			if(key === "id"){
				query += " AND users.id = ?";
				params.push(userData[key]);
				
			}else if(key === "email"){
				query += " AND users.mail = ?";
				params.push(userData[key]);
				
			}
		}
	}
	
	self.sqlConnection.query(query, params,
		function(err, rows, fields){
			
			if(err){
				callback(err, new this.errors.DatabaseError(), false);
			}
			
			callback(err, results);
		}
	);
};

UserController.prototype.findOrCreate = function(accessToken, refreshToken, profile){
	
}

module.exports = UserController;