/**
 * The main class of this project
 * @constructor
 */

var Booki = function(){
	var self			= this;
	
	//Require modules
	self.mongoose		= require("mongoose");
	self.apicache		= require("apicache");
	self.passport		= require("passport");
	self.bodyParser		= require("body-parser");
	self.cookieParser	= require("cookie-parser");
	self.express		= require("express");
	self.events			= require("events");
	self.i18n			= require("i18n");
	self.validate		= require("express-validation");
	
	//Store some values
	self.apicacheMiddle	= self.apicache.middleware;
	self.eventEmitter	= new self.events.EventEmitter();
	
	//Configure i18n
	self.i18n.configure({
		locales			:["en", "de"],
		defaultLocale	: "en",
		directory		: __dirname + "/../locales",
		autoReload		: true,
		extension		: ".json",
		prefix			: "booki-",
	});
	
	//Load error messages
	self.Errors			= require("./Errors");
	self.errors			= new self.Errors(self.i18n);
	
	//Register mongoose schemaTypes
	self.mongoose.Schema.Types.Email	= require("./schemaTypes/Email");
	self.mongoose.Schema.Types.URL		= require("./schemaTypes/URL");
	
	//Load config
	self.config							= require("../config.json");
	
	//Connect to to the database
	self.mongoose.connect("mongodb://" + self.config.DB_HOST + "/" + self.config.DB_NAME);
	
	//Start the server
	self.app			= new self.express();
	
	self.server = self.app.listen(self.config.HTTP_PORT, function(){
		self.eventEmitter.emit("Booki::server::init", self.server.address().address, self.server.address().port);
	});
	
	//Configure the server
	self.app.use(self.express.static("../static"));
	self.app.use(self.bodyParser.json());
	self.app.use(self.bodyParser.urlencoded({
		extended: true
	}));
	self.app.use(self.i18n.init);
	self.app.use(self.cookieParser());
	self.app.use(self.passport.initialize());
	self.app.use(self.errorHandler);
	
	//Do the routing
	self.Routing		= require("./Routing")(self);
};

Booki.prototype.errorHandler = function(err, req, res, next) {
	console.log("#-#");
	next(err, req, res, next);
}

module.exports = Booki;