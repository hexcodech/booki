/**
 * Authenticates a user
 * @constructor
 */

var AuthController = function(i18n, sqlConnection){
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.UserController	= require("../controllers/UserController");
	
	this.events			= require("events");
	this.sql			= require("mysql"); 
	this.crypto			= require("crypto");
	this.passport		= require("passport");
	
	//init variables
	this.config			= require("../../config.json");
	this.i18n			= i18n;
	this.sqlConnection	= sqlConnection;
	this.eventEmitter	= new this.events.EventEmitter();
	
	//Register providers
	var FacebookStrategy = require("passport-facebook").Strategy;
	
	this.passport.use(
		new FacebookStrategy({
			clientID:			this.config.FACEBOOK_APP_ID,
			clientSecret:		this.config.FACEBOOK_APP_SECRET,
			callbackURL:		this.config.FACEBOOK_CALLBACK_URL
		},
		function(accessToken, refreshToken, profile, done) {
			/*User.findOrCreate(..., function(err, user) {
				if (err) { return done(err); }
					done(null, user);
			});*/
		})
	);
	
	
};

AuthController.prototype.authFacebook = function(request, response){
	
}

module.exports = AuthController;