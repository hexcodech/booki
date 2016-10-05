/**
 * Authenticates users
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
	
	this.User			= require("../models/User")(this.i18n, this.errors, this.mongoose);
	
	//init variables
	this.config			= require("../../config.json");
	this.eventEmitter	= new this.events.EventEmitter();
	
	//Register providers
	var LocalStrategy		= require("passport-local").Strategy;
	var FacebookStrategy	= require("passport-facebook").Strategy;
	var TwitterStrategy		= require("passport-twitter").Strategy;
	var GoogleStrategy		= require("passport-google-oauth").OAuth2Strategy;
	
	//With username(email)/password
	this.passport.use(new LocalStrategy(
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
	
	this.app.post("/auth/local",			function(request, response, next){
		self.passport.authenticate("local", function(err, user, info){
			auth(request, response, next, err, user, info);
		})(request, response, next);
	});
	
	//With Facebook
	this.passport.use(
		new FacebookStrategy({
			clientID					: this.config.FACEBOOK_APP_ID,
			clientSecret				: this.config.FACEBOOK_APP_SECRET,
			callbackURL					: this.config.HOST + this.config.FACEBOOK_CALLBACK_PATH
		},
		function(accessToken, refreshToken, profile, done){
			this.User.findOrCreateUserByPassportProfile(profile, {
				facebookAccessToken		: accessToken,
				facebookRefreshToken	: refreshToken
			}, done);
		})
	);
	
	this.app.get("/auth/facebook",		this.passport.authenticate("facebook"));
	
	this.app.get(this.config.FACEBOOK_CALLBACK_PATH, this.passport.authenticate("facebook", {
		successRedirect					: this.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect					: this.config.FAILURE_SUCCESS_REDIRECT
	}));
	
	//With Twitter
	this.passport.use(
		new TwitterStrategy({
			consumerKey					: this.config.TWITTER_CONSUMER_KEY,
			consumerSecret				: this.config.TWITTER_CONSUMER_SECRET,
			callbackURL					: this.config.HOST + this.config.TWITTER_CALLBACK_PATH
		},
		function(token, tokenSecret, profile, done) {
			this.User.findOrCreateUserByPassportProfile(profile, {
				twitterToken		: token,
				twitterTokenSecret	: tokenSecret
			}, done);
		})
	);
	
	this.app.get("/auth/twitter",		this.passport.authenticate("twitter"));
	
	this.app.get(this.config.TWITTER_CALLBACK_PATH, this.passport.authenticate("twitter", {
		successRedirect					: this.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect					: this.config.FAILURE_SUCCESS_REDIRECT
	}));
	
	//With Google
	passport.use(
		new GoogleStrategy({
			clientID					: this.config.GOOGLE_CLIENT_ID,
			clientSecret				: this.config.GOOGLE_CLIENT_SECRET,
			callbackURL					: this.config.HOST + this.config.GOOGLE_CALLBACK_PATH
		},
		function(accessToken, refreshToken, profile, done) {
			this.User.findOrCreateUserByPassportProfile(profile, {
				googleAccessToken		: accessToken,
				googleRefreshToken		: refreshToken
			}, done);
		})
	);
	
	app.get("/auth/google", passport.authenticate("google",{
		scope: ["https://www.googleapis.com/auth/plus.login"]
	}));
	
	this.app.get(this.config.GOOGLE_CALLBACK_PATH, this.passport.authenticate("google", {
		successRedirect					: this.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect					: this.config.FAILURE_SUCCESS_REDIRECT
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