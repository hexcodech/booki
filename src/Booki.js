/**
 * The main class of this project
 */

class Booki {
	
	constructor(){
		
		//Reference to the instance because of http://es6-features.org/#ParameterContextMatching
		this.booki				= this;
		
		//Require modules
		this.mongoose			= require("mongoose");
		this.mongoose.Promise	= global.Promise; //Use ES6 promises
		
		
		this.ejs				= require("ejs");
		this.events				= require("events");
		this.i18n				= require("i18n");
		this.errors				= require("errors");
		
		this.express			= require("express");
		this.express_session	= require("express-session");
		this.validate			= require("express-validation");
		this.bodyParser			= require("body-parser");
		this.cookieParser		= require("cookie-parser");
		
		this.Joi				= require("joi");
		this.nodemailer			= require("nodemailer");
		
		this.crypto				= require("crypto");
		
		this.oauth2orize		= require("oauth2orize");
		this.passport			= require("passport");
		
		this.BasicStrategy		= require("passport-http").BasicStrategy
		this.LocalStrategy		= require("passport-local").Strategy;
		this.BearerStrategy		= require("passport-http-bearer").Strategy;
		this.FacebookStrategy	= require("passport-facebook").Strategy;
		this.GoogleStrategy		= require("passport-google-oauth").OAuth2Strategy;
		
		this.bindAll(this, ["bindAll", "getLocale", "generateRandomString", "hash"]);
		
		//Store some values
		this.eventEmitter		= new this.events.EventEmitter();
		
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
		this.app.use(this.express_session({//OAuth2orize requires it
			secret				: this.config.SESSION_SECRET,
			saveUninitialized	: true,
			resave				: true
		}));
		this.app.use(this.i18n.init);
		this.app.use(this.passport.initialize());
		this.app.use(this.passport.session());
		
		this.app.use(
			(request, response, next) => {
			//UTF 8 JSON all the way EXCEPT /static/
			if(!request.url.startsWith("/static/")){
				response.header("Content-Type", "application/json; charset=utf-8");
			}else{
				response.setHeader("charset", "utf-8");
			}
			
			next();
		});
		
		
		//Load all Models
		let UserClass				= require("./models/User");
		let OAuthClientClass		= require("./models/OAuthClient");
		let OAuthAccessTokenClass	= require("./models/OAuthAccessToken");
		let OAuthCodeClass			= require("./models/OAuthCode");
		
		this.User					= new UserClass(this.booki);
		this.OAuthClient			= new OAuthClientClass(this.booki);
		this.OAuthAccessToken		= new OAuthAccessTokenClass(this.booki);
		this.OAuthCode				= new OAuthCodeClass(this.booki);
		
		//Setup the authorization server
		this.oauth2Server			= this.oauth2orize.createServer();
		
		//Do the routing
		let Routing			= require("./Routing");
		
		this.routing		= new Routing(this.booki);
	}
	
	bindAll(object, functions){
		for(var i=0;i<functions.length;i++){
			
			try{
				object[functions[i]] = object[functions[i]].bind(object);
			}catch(e){
				throw new Error("Can't bind method " + (typeof functions[i] === "function" ? functions[i].name : functions[i]) + " to " + (functions[i].name ? functions[i].name : "?"));
			}
		}
	}
	
	getLocale(user = null, request = null){
		if(user !== null){
			return user.locale;
		}else if(request !== null){
			return this.i18n.getLocale(request);
		}else{
			return this.config.LOCALES[0]
		}
	}
	
	/**
	 * Generates (unsafe) random string of characters
	 * @function generateRandomString
	 * @param {number} length - Length of the random string.
	 * @returns {String} A random string of a given length
	 */
	 generateRandomString(length){
		return this.crypto.randomBytes(length)
        	.toString("base64")
        	.slice(0, length);
	}
	
	/**
	 * Hash string using this.HASH_ALGORITHM or the passed algorithm
	 * @function hash
	 * @param {string} string - The string to be hashed
	 * @param {string} salt - The salt to be used while hashing
	 * @param {string} [algorithm=this.HASH_ALGORITHM] - The hash algorithm that should be used
	 * @returns {object} - The hashed string, the generated salt and the used hash algorithm {hash: '', salt: '', algorithm: ''}
	 */
	hash(string, salt = null, algorithm = null){
		
		if(!algorithm){
			algorithm = this.config.HASH_ALGORITHM;
		}
		
		if(!salt && salt === false){
			salt = this.generateRandomString(this.config.SALT_LENGTH);
		}
		
	    let hmac;
	    
	    if(salt && salt !== false){
		    hmac = this.crypto.createHmac(algorithm, salt);  
		}else{
			hmac = this.crypto.createHmac(algorithm);
		}
	    hmac.update(string);
	    
	    return {hash: hmac.digest("hex"), salt: salt, algorithm: algorithm};
	};
	
};

module.exports = Booki;