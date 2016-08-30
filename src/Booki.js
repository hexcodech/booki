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
	this.passport		= require("passport");
	this.bodyParser		= require("body-parser");
	this.cookieParser	= require("cookie-parser");
	this.express		= require("express");
	this.events			= require("events");
	this.i18n			= require("i18n");
	this.validate		= require("express-validation");
	
	//Store some values
	this.apicacheMiddle	= this.apicache.middleware;
	this.eventEmitter	= new this.events.EventEmitter();
	
	//Configure i18n
	this.i18n.configure({
		locales			:["en", "de"],
		defaultLocale	: "en",
		directory		: __dirname + "/../locales",
		autoReload		: true,
		extension		: ".json",
		prefix			: "booki-",
	});
	
	//Load error messages
	this.errors			= require("./Error.js")(this.i18n);
	
	//Register mongoose schemaTypes
	this.mongoose.Schema.Types.Email		= require("./schemaTypes/Email.js");
	this.mongoose.Schema.Types.URL			= require("./schemaTypes/URL.js");
	
	//Load config
	this.config			= require("../config.json");
	
	//Connect to to the database
	this.mongoose.connect("mongodb://" + this.config.DB_HOST + "/" + this.config.DB_NAME);
	
	//Start the server
	this.app			= new this.express();
	
	this.server = this.app.listen(this.config.HTTP_PORT, function(){
		self.eventEmitter.emit("Booki::server::init", self.server.address().address, self.server.address().port);
	});
	
	//Configure the server
	this.app.use(this.express.static("../static"));
	this.app.use(this.bodyParser.json());
	this.app.use(this.cookieParser());
	this.app.use(this.i18n.init);
	this.app.use(this.passport.initialize());
	this.app.use(this.errorHandler);
	
	//Do the routing
	this.Routing		= require("./Routing.js")(this);
};

Booki.prototype.errorHandler = function(err, req, res, next) {
	console.log("#-#");
	next(err, req, res, next);
}

module.exports = Booki;