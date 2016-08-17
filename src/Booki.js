/**
 * The main class of this project
 * @constructor
 */

var Booki = function(){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.apicache		= require("apicache");
	this.apicacheMiddle	= this.apicache.middleware;
	this.bodyParser		= require("body-parser");
	this.cookieParser	= require("cookie-parser");
	this.express		= require("express");
	this.events			= require("events");
	this.sql			= require("mysql"); 
	this.i18n			= require("i18n");
	this.passport		= require("passport");
	this.validate		= require("express-validation");
	
	
	this.Error			= require("./Error.js");
	this.Routing		= require("./Routing.js"); 

	//Init variables
	this.config			= require("../config.json");
	
	this.errors			= this.Error.getErrorsObject();
	this.eventEmitter	= new this.events.EventEmitter();
	this.app			= new this.express();
	
	this.server = this.app.listen(this.config.HTTP_PORT, function(){
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
	
	//Configure i18n
	i18n.configure({
		locales			:["en", "de"],
		defaultLocale	: "en",
		directory		: __dirname + "../locales",
		autoReload		: true,
		extension		: ".json",
		prefix			: "booki-",
	});
	
	//Configure the rest server
	this.app.configure(function() {
		this.app.use(this.bodyParser.json());
		this.app.use(this.cookieParser());
		this.app.use(this.i18n.init);
		this.app.use(this.passport.initialize());
	});
};

module.exports = Booki;