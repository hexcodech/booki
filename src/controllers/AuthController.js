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
	
	this.User			= require("../models/User")(this.i18n, this.mongoose);
	
	//init variables
	this.config			= require("../../config.json");
	this.eventEmitter	= new this.events.EventEmitter();
	
	//Register providers
	var LocalStrategy		= require("passport-local").Strategy;
	var FacebookStrategy	= require("passport-facebook").Strategy;
	
	//With username(email)/password
	this.passport.use(new LocalStrategy(
		function(email, password, done){
			this.User.findOne({email: email}, function(err, user){
				
				if(err){return done(null, false, err);}
				
				if(!user || !user.verifyPassword(password)) {
					return done(null, false, new this.errors.Loginerrors());
				}
				
				return done(null, user);
			});
		}
	));
	
	this.app.post("/auth/local",			function(request, response, next){
		self.passport.authenticate("local", function(err, user, info){
			auth(request, response, next, err, user, info);
		})(request, response, next);
	});
	
	//With facebook
	this.passport.use(
		new FacebookStrategy({
			clientID:			this.config.FACEBOOK_APP_ID,
			clientSecret:		this.config.FACEBOOK_APP_SECRET,
			callbackURL:		this.config.HOST + this.config.FACEBOOK_CALLBACK_PATH
		},
		function(accessToken, refreshToken, profile, done){
			//check if a user with the provided mail addresses exists
			this.User.getUserByPassportProfile(profile, function(user, err){
				if(err){return done(err, false);}
				
				if(user){
					//update values for the current user
					
					user.updateFromPassportProfile(profile, {
						facebookAccessToken		: accessToken,
						facebookRefreshToken	: refreshToken
					});
					
				}else{
					//we have to create a new user
					user = new this.User.createFromPassportProfile(profile, {
						email					: profile.emails[0].value,
						
						facebookAccessToken		: accessToken,
						facebookRefreshToken	: refreshToken
					});
				}
				
				user.save(function(err){
					if(err){return done(err, false);}
					
					done(null, user)
				});
				
			});
		})
	);
	
	//Do the routings
	
	/*
		Redirects the user to Facebook. When the authentication completes,
		Facebook will redirect the user back to us at FACEBOOK_CALLBACK_PATH
	*/
	
	this.app.get("/auth/facebook",			this.passport.authenticate("facebook"));
	
	this.app.get(this.config.FACEBOOK_CALLBACK_PATH,	this.passport.authenticate("facebook", {
		successRedirect: this.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect: this.config.FAILURE_SUCCESS_REDIRECT
	}));
	
	
	
	function auth(request, response, next, err, user, info){
		
		response.setHeader("Content-Type", "application/json; charset=utf-8");
		
		if(err){
			return response.end(JSON.stringify(err.toJSON()));
		}
		
		if(!user){
			
			var e = new self.errors.err.AuthenticationError({
				message: request.__(self.errors.errorMessages.AuthenticationError.defaultMessage)
			});
			
			return response.end(JSON.stringify(e.toJSON()));
		}
		
		request.login(user, function(err) {
			if (err) { return next(err); }
			
			return response.end("auth successful")
		});
	}
	
};

module.exports = AuthController;