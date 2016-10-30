/**
 * Authenticates users
 */

class AuthController {
	
	constructor({booki, config, app, i18n, errorController, crypto, passport, getLocale, LocalStrategy, FacebookStrategy, TwitterStrategy, GoogleStrategy}, User){
		
		//Store passed parameters
		this.config				= config;
		this.app				= app;
		this.i18n				= i18n;
		this.errorController	= errorController;
		this.crypto				= crypto;
		this.passport			= passport;
		
		this.getLocale			= getLocale;
		
		this.User				= User;
		
		//With username(email)/password
		this.passport.use(new LocalStrategy(
			function(email, password, done){
				User.findOne({email: email}, (err, user) => {
					
					if(err || user.passwordHash.length > 0 || !user || !user.verifyPassword(password)) {
						return done(null, false, new errors.LoginError());
					}
					
					return done(null, user);
				});
			}
		));
		
		this.app.post("/v1/auth/local/login", (request, response, next) => {
			
			this.passport.authenticate("local",	(err, user, info) => {
				
				this.auth(request, response, next, err, user, info);
				
			})(request, response, next);
			
		});
		
		//With Facebook
		this.passport.use(
			new FacebookStrategy({
				clientID					: this.config.FACEBOOK_APP_ID,
				clientSecret				: this.config.FACEBOOK_APP_SECRET,
				callbackURL					: this.config.HOST + this.config.FACEBOOK_CALLBACK_PATH,
				profileFields				: ['user_friends', 'user_location'],
				passReqToCallback			: true
			},
			(request, accessToken, refreshToken, profile, done) => {
				
				this.User.findOrCreateUserByPassportProfile(profile, {
					preferredLocale		: this.getLocale(null, request),
					facebookFriends			: profile.user_friends,
					placeOfResidence		: profile.user_location.name,
					facebookAccessToken		: accessToken,
					facebookRefreshToken	: refreshToken,
				}, done);
				
			})
		);
		
		this.app.get("/v1/auth/facebook/login",		this.passport.authenticate("facebook", {
			scope : ['user_friends', 'user_location']
		}));
		
		this.app.get(this.config.FACEBOOK_CALLBACK_PATH, (request, response, next) => {
			
			this.passport.authenticate("facebook", (error, user, info) => {
				
				this.auth(request, response, next, error, user, info);
				
			})(request, response, next);
			
		}, this.catchInternalError);
		
		//With Twitter
		this.passport.use(
			new TwitterStrategy({
				consumerKey					: this.config.TWITTER_CONSUMER_KEY,
				consumerSecret				: this.config.TWITTER_CONSUMER_SECRET,
				callbackURL					: this.config.HOST + this.config.TWITTER_CALLBACK_PATH,
				passReqToCallback			: true
			},
			(request, token, tokenSecret, profile, done) => {
				
				this.User.findOrCreateUserByPassportProfile(profile, {
					preferredLocale		: this.getLocale(null, request),
					twitterToken		: token,
					twitterTokenSecret	: tokenSecret
				}, done);
				
			})
		);
		
		this.app.get("/v1/auth/twitter/login",		this.passport.authenticate("twitter"));
		
		this.app.get(this.config.TWITTER_CALLBACK_PATH, (request, response, next) => {
			
			this.passport.authenticate("twitter", (error, user, info) => {
				
				this.auth(request, response, next, error, user, info);
				
			})(request, response, next);
			
		}, this.catchInternalError);
		
		//With Google
		this.passport.use(
			new GoogleStrategy({
				clientID					: this.config.GOOGLE_CLIENT_ID,
				clientSecret				: this.config.GOOGLE_CLIENT_SECRET,
				callbackURL					: this.config.HOST + this.config.GOOGLE_CALLBACK_PATH,
				passReqToCallback			: true
			},
			(request, accessToken, refreshToken, profile, done) => {
				this.User.findOrCreateUserByPassportProfile(profile, {
					preferredLocale			: this.getLocale(null, request),
					googleAccessToken		: accessToken,
					googleRefreshToken		: refreshToken
				}, done);
				
			})
		);
		
		this.app.get("/v1/auth/google/login", this.passport.authenticate("google", {
			scope: ["openid profile email"]
		}));
		
		this.app.get(this.config.GOOGLE_CALLBACK_PATH, (request, response, next) => {
			
			this.passport.authenticate("google", (error, user, info) => {
				
				this.auth(request, response, next, error, user, info);
				
			})(request, response, next);
			
		}, this.catchInternalError);
		
	}
	
	auth(request, response, next, error, user, info){
		
		let json = {success: false, authToken: "", error: null};
		
		if(error){
			json.error = this.errorController.translateError(error, this.getLocale(user, request));
		}
		
		if(!user && json.error === null){
			
			json.error = this.errorController.translateError( 
				new this.errorController.errors.AuthenticationError(),
				this.getLocale(user, request)
			);
			
		}
		
		return request.logIn(user, {session: false}, function(err) {
			if(err && json.err === null){
				
				json.error = this.errorController.translateError( 
					new this.errorController.errors.AuthenticationError({
						message: err.message
					}),
					this.getLocale(user, request)
				);
			}
			
			if(user){
				json.authToken	= user.generateAuthToken();
				json.success	= true;
			}
			
			response.json(json);
			
			return response.end();
		});
	}
	
	catchInternalError(error, request, response, next){
		if(error){
			console.log(error);
			return response.redirect(this.config.LOGIN_FAILURE_REDIRECT);
		}else{
			next();
		}
	}
};

module.exports = AuthController;