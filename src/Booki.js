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
	
	this.Routing		= require("./Routing.js"); 
	this.User			= require("./User.js");

	//Init variables
	this.config			= require(""../config.json");
	this.eventEmitter	= new this.events.EventEmitter();
	this.rest			= new this.express();
	
	this.server = this.rest.listen(this.config.httpPort, function(){
		self.eventEmitter.emit("Booki::server::init", self.server.address().address, self.server.address().port);
	});
	
	this.sqlConnection = this.sql.createConnection({
		host			: this.config.host,
		user			: this.config.user,
		password		: this.config.password,
		database		: this.config.database
	});
	this.sqlConnection.connect();
	
	this.routing		= new this.Routing(this);
	this.user			= new this.User(this);
	
	//Configure the rest server
	this.rest.use(this.i18n.init);
	
};

module.exports = Booki;