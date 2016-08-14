/**
 * The main class of this project
 * @constructor
 */

var Booki = function(){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.express		= require("express");
	this.events			= require("events");
	this.sql			= require("mysql"); 
	this.i18n			= require("i18n");
	this.passport		= require("passport");
	
	this.Routing		= require("./Routing.js"); 
	this.User			= require("./User.js");

	//Init variables
	this.config			= require("../config.json");
	this.eventEmitter	= new this.events.EventEmitter();
	this.rest			= new this.express();
	
	this.server = this.rest.listen(this.config.HTTP_PORT, function(){
		self.eventEmitter.emit("Booki::server::init", self.server.address().address, self.server.address().port);
	});
	
	this.sqlConnection = this.sql.createConnection({
		host			: this.config.HOST,
		user			: this.config.USER,
		password		: this.config.PASSWORD,
		database		: this.config.DATABASE
	});
	this.sqlConnection.connect();
	
	this.routing		= new this.Routing(this);
	this.user			= new this.User(this);
	
	//Configure the rest server
	this.rest.use(this.i18n.init);
	
};

module.exports = Booki;