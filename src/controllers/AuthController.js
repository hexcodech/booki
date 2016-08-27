/**
 * Authenticates a user
 * @constructor
 */

var AuthController = function(app, i18n, errors, mongoose){
	//store passed params
	this.app			= app;
	this.errors			= errors;
	this.i18n			= i18n;
	this.mongoose		= mongoose;
	
	//keep reference to 'this'
	var self			= this;
	
	//Require modules
	this.events			= require("events");
	this.crypto			= require("crypto");
	this.passport		= require("passport");
	
	this.User			= require("../models/User");
	
	//init variables
	this.config			= require("../../config.json");
	this.eventEmitter	= new this.events.EventEmitter();
	
	//Register providers
	var LocalStrategy		= require("passport-local").Strategy;
	var FacebookStrategy	= require("passport-facebook").Strategy;
	
	//With username(email)/password
	passport.use(new LocalStrategy(
		function(email, password, done){
			this.User.findOne({email: email}, function(err, user){
				
				if(err){return done(null, false, err);}
				
				if(!user || !user.verifyPassword(password)) {
					return done(null, false, new this.errors.LoginError());
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
			//check if a user with the provided mail addresses exists
			
			var user	= null;
			
			for(var i=0;i<profile.emails.length;i++){
				this.User.findOne({email: email}, function(err, _user){
					
					if(err){return done(null, false, err);}
					
					if(_user){
						//User exists
						user	= _user;
						
						i		= profile.emails.length;//breaks the loop
					}
					
				});
			}
			
			if(user){
				//update values for the current user
				
			}else{
				//we have to create a new user
				user = new this.User.createFromPassportProfile(profile, {
					email					: profile.emails[0].value,
					
					facebookAccessToken		: accessToken,
					facebookRefreshToken	: refreshToken
				});
			}
			
		})
	);
	
	//Do the routings
	
	/*
		Redirects the user to Facebook. When the authentication completes,
		Facebook will redirect the user back to us at
		/auth/facebook/callback
	*/
	
	this.app.get("/auth/facebook",			this.passport.authenticate("facebook", {
		session: false
	}));
	
	this.app.get("/auth/facebook/callback",	this.passport.authenticate("facebook", {
		successRedirect: "/",
		failureRedirect: "/login"
	}));
	
};

AuthController.prototype.authFacebook = function(request, response){
	
}

module.exports = AuthController;