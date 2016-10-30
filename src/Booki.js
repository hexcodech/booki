/**
 * The main class of this project
 */

class Booki {
	
	constructor(){
		
		//Reference to oneself because of http://es6-features.org/#ParameterContextMatching
		this.booki			= this;
		
		//Require modules
		this.mongoose			= require("mongoose");
		this.apicache			= require("apicache");
		this.passport			= require("passport");
		this.bodyParser			= require("body-parser");
		this.cookieParser		= require("cookie-parser");
		this.express			= require("express");
		this.events				= require("events");
		this.i18n				= require("i18n");
		this.validate			= require("express-validation");
		this.Joi				= require("joi");
		this.crypto				= require("crypto");
		this.nodemailer			= require("nodemailer");
		this.passport			= require("passport");
		this.errors				= require("errors");
		this.LocalStrategy		= require("passport-local").Strategy;
		this.FacebookStrategy	= require("passport-facebook").Strategy;
		this.TwitterStrategy	= require("passport-twitter").Strategy;
		this.GoogleStrategy		= require("passport-google-oauth").OAuth2Strategy;
		
		//Store some values
		this.apicacheMiddle	= this.apicache.middleware;
		this.eventEmitter	= new this.events.EventEmitter();
		
		//Load config
		this.config							= require("../config.json");
		
		//Configure i18n
		this.i18n.configure({
			locales			: this.config.LOCALES,
			defaultLocale	: this.config.LOCALES[0],
			directory		: __dirname + "/../locales",
			autoReload		: true,
			extension		: ".json",
			prefix			: "booki-",
		});
		
		//Load error messages
		let ErrorController		= require("./controllers/ErrorController");
		this.errorController	= new ErrorController(this.booki);
		
		//Connect to to the database
		this.mongoose.connect("mongodb://" + this.config.DB_HOST + "/" + this.config.DB_NAME);
		
		//Start the server
		this.app			= new this.express();
		
		this.server = this.app.listen(this.config.HTTP_PORT, () => {
			this.eventEmitter.emit("Booki::server::init", this.server.address().address, this.server.address().port);
		});
		
		//Configure the server
		this.app.use("/static/", this.express.static("../static"));
		this.app.use(this.bodyParser.json());
		this.app.use(this.bodyParser.urlencoded({
			extended: true
		}));
		this.app.use(this.i18n.init);
		this.app.use(this.passport.initialize());
		
		this.app.use(
			(request, response, next) => {
			//UTF 8 JSON all the way EXCEPT /static/
			if(!request.url.startsWith("/static/")){
				response.header("Content-Type", "application/json; charset=utf-8");
			}else{
				res.setHeader("charset", "utf-8");
			}
			
			next();
		});
		
		//Do the routing
		let Routing			= require("./Routing");
		
		this.routing		= new Routing(this.booki);
	}
	
	getLocale(user = null, request = null){
		if(user !== null){
			return user.preferedLocale;
		}else if(request !== null){
			return this.i18n.getLocale(request);
		}else{
			return this.config.LOCALES[0]
		}
	}
	
};

module.exports = Booki;