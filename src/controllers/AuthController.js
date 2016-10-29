/**
 * Authenticates users
 */

class AuthController {
	
	constructor({booki, config, app, i18n, errorController, crypto, passport, LocalStrategy, FacebookStrategy, TwitterStrategy, GoogleStrategy}, User){
		
		//Store passed parameters
		this.config				= config;
		this.app				= app;
		this.i18n				= i18n;
		this.errorController	= errorController;
		this.crypto				= crypto;
		this.passport			= passport;
		
		this.User				= User;
		
		//With username(email)/password
		this.passport.use(new LocalStrategy(
			function(email, password, done){
				User.findOne({email: email}, function(err, user){
					
					if(err || user.passwordHash.length > 0 || !user || !user.verifyPassword(password)) {
						return done(null, false, new errors.LoginError());
					}
					
					return done(null, user);
				});
			}
		));
		
		this.app.post("/v1/auth/local", (request, response, next) => {
			
			this.passport.authenticate("local",	(err, user, info) => {
				
				this.auth(request, response, next, err, user, info);
				
			})(request, response, next);
			
		});
		
		//With Facebook
		this.passport.use(
			new FacebookStrategy({
				clientID					: this.config.FACEBOOK_APP_ID,
				clientSecret				: this.config.FACEBOOK_APP_SECRET,
				callbackURL					: this.config.HOST + this.config.FACEBOOK_CALLBACK_PATH
			},
			(accessToken, refreshToken, profile, done) => {
				
				this.User.findOrCreateUserByPassportProfile(profile, {
					facebookAccessToken		: accessToken,
					facebookRefreshToken	: refreshToken
				}, done);
				
			})
		);
		
		this.app.get("/v1/auth/facebook",		this.passport.authenticate("facebook"));
		
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
			(token, tokenSecret, profile, done) => {
				
				this.User.findOrCreateUserByPassportProfile(profile, {
					twitterToken		: token,
					twitterTokenSecret	: tokenSecret
				}, done);
				
			})
		);
		
		this.app.get("/v1/auth/twitter",		this.passport.authenticate("twitter"));
		
		this.app.get(this.config.TWITTER_CALLBACK_PATH, this.passport.authenticate("twitter", {
			successRedirect					: this.config.LOGIN_SUCCESS_REDIRECT,
			failureRedirect					: this.config.FAILURE_SUCCESS_REDIRECT
		}));
		
		//With Google
		this.passport.use(
			new GoogleStrategy({
				clientID					: this.config.GOOGLE_CLIENT_ID,
				clientSecret				: this.config.GOOGLE_CLIENT_SECRET,
				callbackURL					: this.config.HOST + this.config.GOOGLE_CALLBACK_PATH
			},
			(accessToken, refreshToken, profile, done) => {
				
				this.User.findOrCreateUserByPassportProfile(profile, {
					googleAccessToken		: accessToken,
					googleRefreshToken		: refreshToken
				}, done);
				
			})
		);
		
		this.app.get("/v1/auth/google", this.passport.authenticate("google",{
			scope: ["https://www.googleapis.com/auth/plus.login"]
		}));
		
		this.app.get(this.config.GOOGLE_CALLBACK_PATH, this.passport.authenticate("google", {
			successRedirect					: this.config.LOGIN_SUCCESS_REDIRECT,
			failureRedirect					: this.config.FAILURE_SUCCESS_REDIRECT
		}));
		
	}
	
	auth(request, response, next, error, user, info){
		
		if(error){
			return this.errorController.expressErrorResponse(request, response, error);
		}
		
		if(!user){
			
			return this.errorController.expressErrorResponse(request, response, 
				new this.errorController.errors.AuthenticationError()
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