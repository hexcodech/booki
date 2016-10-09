/**
 * Authenticates users
 * @constructor
 */

var AuthController = function(app, i18n, errorController, User){
	
	var self				= this;
	
	//Store passed parameters
	self.app				= app;
	self.i18n				= i18n;
	self.errorController	= errorController;
	self.User				= User;
	
	//Require modules
	self.events				= require("events");
	self.crypto				= require("crypto");
	self.passport			= require("passport");
	
	//init variables
	self.config				= require("../../config.json");
	self.eventEmitter		= new self.events.EventEmitter();
	
	//Register providers
	var LocalStrategy		= require("passport-local").Strategy;
	var FacebookStrategy	= require("passport-facebook").Strategy;
	var TwitterStrategy		= require("passport-twitter").Strategy;
	var GoogleStrategy		= require("passport-google-oauth").OAuth2Strategy;
	
	//With username(email)/password
	self.passport.use(new LocalStrategy(
		function(email, password, done){
			User.findOne({email: email}, function(err, user){
				
				if(err || user.passwordHash.length > 0 || !user || !user.verifyPassword(password)) {
					return done(null, false, new errors.LoginError());
				}
				
				return done(null, user);
			});
		}
	));
	
	self.app.post("/auth/local", function(request, response, next){
		self.passport.authenticate("local",	function(err, user, info){
			
			auth(request, response, next, err, user, info);
			
		})(request, response, next);
	});
	
	//With Facebook
	self.passport.use(
		new FacebookStrategy({
			clientID					: self.config.FACEBOOK_APP_ID,
			clientSecret				: self.config.FACEBOOK_APP_SECRET,
			callbackURL					: self.config.HOST + self.config.FACEBOOK_CALLBACK_PATH
		},
		function(accessToken, refreshToken, profile, done){
			self.User.findOrCreateUserByPassportProfile(profile, {
				facebookAccessToken		: accessToken,
				facebookRefreshToken	: refreshToken
			}, done);
		})
	);
	
	self.app.get("/auth/facebook",		self.passport.authenticate("facebook"));
	
	self.app.get(self.config.FACEBOOK_CALLBACK_PATH, self.passport.authenticate("facebook", {
		successRedirect					: self.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect					: self.config.FAILURE_SUCCESS_REDIRECT
	}));
	
	//With Twitter
	self.passport.use(
		new TwitterStrategy({
			consumerKey					: self.config.TWITTER_CONSUMER_KEY,
			consumerSecret				: self.config.TWITTER_CONSUMER_SECRET,
			callbackURL					: self.config.HOST + self.config.TWITTER_CALLBACK_PATH
		},
		function(token, tokenSecret, profile, done) {
			self.User.findOrCreateUserByPassportProfile(profile, {
				twitterToken		: token,
				twitterTokenSecret	: tokenSecret
			}, done);
		})
	);
	
	self.app.get("/auth/twitter",		self.passport.authenticate("twitter"));
	
	self.app.get(self.config.TWITTER_CALLBACK_PATH, self.passport.authenticate("twitter", {
		successRedirect					: self.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect					: self.config.FAILURE_SUCCESS_REDIRECT
	}));
	
	//With Google
	self.passport.use(
		new GoogleStrategy({
			clientID					: self.config.GOOGLE_CLIENT_ID,
			clientSecret				: self.config.GOOGLE_CLIENT_SECRET,
			callbackURL					: self.config.HOST + self.config.GOOGLE_CALLBACK_PATH
		},
		function(accessToken, refreshToken, profile, done) {
			self.User.findOrCreateUserByPassportProfile(profile, {
				googleAccessToken		: accessToken,
				googleRefreshToken		: refreshToken
			}, done);
		})
	);
	
	self.app.get("/auth/google", self.passport.authenticate("google",{
		scope: ["https://www.googleapis.com/auth/plus.login"]
	}));
	
	self.app.get(self.config.GOOGLE_CALLBACK_PATH, self.passport.authenticate("google", {
		successRedirect					: self.config.LOGIN_SUCCESS_REDIRECT,
		failureRedirect					: self.config.FAILURE_SUCCESS_REDIRECT
	}));
	
	
	function auth(request, response, next, error, user, info){
		
		if(error){
			return self.errorController.expressErrorResponse(request, response, error);
		}
		
		if(!user){
			
			return self.errorController.expressErrorResponse(request, response, 
					new self.errorController.errors.AuthenticationError()
			);
		}
		
		request.login(user, function(err) {
			if (err) { return next(err); }
			
			//TODO correct json format
			return response.end("auth successful")
		});
	}
	
};

module.exports = AuthController;