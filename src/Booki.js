/**
 * The main class of this project
 * @constructor
 */

var Booki = function(){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.mongoose		= require("mongoose");
	this.apicache		= require("apicache");
	this.bodyParser		= require("body-parser");
	this.cookieParser	= require("cookie-parser");
	this.express		= require("express");
	this.events			= require("events");
	this.i18n			= require("i18n");
	this.passport		= require("passport");
	this.validate		= require("express-validation");
	
	//Custom modules
	this.Error			= require("./Error.js");
	this.Routing		= require("./Routing.js");
	
	//Configure i18n
	this.i18n.configure({
		locales			:["en", "de"],
		defaultLocale	: "en",
		directory		: __dirname + "/../locales",
		autoReload		: true,
		extension		: ".json",
		prefix			: "booki-",
	});

	//Init variables
	this.config			= require("../config.json");
	
	this.apicacheMiddle	= this.apicache.middleware;
	this.errors_		= new this.Error(this.i18n);
	this.errors			= this.errors_.getErrorsObject();
	this.eventEmitter	= new this.events.EventEmitter();
	this.app			= new this.express();
	
	//Register mongoose schemaTypes
	this.mongoose.Schema.Types.Email		= require("./schemaTypes/Email.js");
	this.mongoose.Schema.Types.URL			= require("./schemaTypes/URL.js");
	
	//Init the other stuff
	
	this.server = this.app.listen(this.config.HTTP_PORT, function(){
		self.eventEmitter.emit("Booki::server::init", self.server.address().address, self.server.address().port);
	});
	
	this.mongoose.connect("mongodb://localhost/booki");
	
	this.routing		= new this.Routing(this);
	
	//Configure the rest server
	this.app.use(this.bodyParser.json());
	this.app.use(this.cookieParser());
	this.app.use(this.i18n.init);
	this.app.use(this.passport.initialize());
};

module.exports = Booki;