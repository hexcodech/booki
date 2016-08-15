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
	var LocalStrategy		= require('passport-local').Strategy;
	var FacebookStrategy	= require("passport-facebook").Strategy;
	
	//With username(email)/password
	passport.use(new LocalStrategy(
		function(username, password, done){
			this.UserController.get({ mail: username }, function(err, user){
				
				if(err){return done(err);}
				
				if(!user){
					return done(null, false, { message: 'Incorrect username.' });
				}
				if(!user.validPassword(password)) {
					return done(null, false, { message: 'Incorrect password.' });
				}
				return done(null, user);
			});
		}
	));
	
	//With facebook
	this.passport.use(
		new FacebookStrategy({
			clientID:			this.config.FACEBOOK_APP_ID,
			clientSecret:		this.config.FACEBOOK_APP_SECRET,
			callbackURL:		this.config.FACEBOOK_CALLBACK_URL
		},
		function(accessToken, refreshToken, profile, done){
			this.UserController.findOrCreate(accessToken, refreshToken, profile, function(err, user){
				
				if(err){
					return done(err, false, { message: 'Unknown error.' });
				}
				
				done(null, user);
			});
		})
	);
	
	
};

AuthController.prototype.authFacebook = function(request, response){
	
}

module.exports = AuthController;