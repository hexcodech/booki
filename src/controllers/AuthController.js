/**
 * Authenticates users
 */

class AuthController {
	
	constructor(
		{
			booki,				config,				app,				i18n,
			mongoose,			ejs,				errorController,	crypto,
			passport,			oauth2orize,		oauth2Server,		getLocale,
			BasicStrategy,		LocalStrategy,		BearerStrategy,		FacebookStrategy,
			GoogleStrategy
		}
		){
		
		//Store passed parameters
		this.config				= config;
		this.app				= app;
		this.i18n				= i18n;
		this.mongoose			= mongoose;
		this.ejs				= ejs;
		this.errorController	= errorController;
		
		this.crypto				= crypto;
		this.passport			= passport;
		
		this.oauth2Server		= oauth2Server;
		this.oauth2orize		= oauth2orize;
		
		this.getLocale			= getLocale;
		
		this.User				= this.mongoose.model("User");
		
		this.OAuthClient		= this.mongoose.model("OAuthClient");
		this.OAuthAccessToken	= this.mongoose.model("OAuthAccessToken");
		this.OAuthCode			= this.mongoose.model("OAuthCode");
		
		booki.bindAll(this, ["loginView", "mailVerificationView", "auth", "authFacebookCallback", "authGoogleCallback", "catchInternalError", "catchInternalErrorView"]);
		
		this.passport.serializeUser((user, done) => {
			done(null, user._id);
		});
		
		this.passport.deserializeUser((userId, done) => {
			
			this.User.findById(userId, (err, user) => {
				if(err){
					done(new this.errorController.errors.DatabaseError({
						message: err.message
					}, null));
				}
				
				done(null, user);
				
			});
		});
		
		//Local registration
		this.registration = (request, response, next) => {
			
		    let firstName		= request.body.firstName,
		        email			= request.body.email,
		        locale			= request.body.locale;
		        
	        if(!locale){
		        locale = this.getLocale(null, request);
	        }
		    
		    this.User.register(firstName, email, locale, (error, user) => {
			    
		    	if(error){
		    		next(error);
		    	}else{
			    	return response.redirect("/views/verify-email?register=true&email=" + email);
		    	}
		    	
		    	response.end();
		    });
		};
		
		this.verifyEmail = (request, response, next) => {
			
		    let	email					= request.body.email,
		    	emailVerificationCode	= request.body.emailVerificationCode,
		        password				= request.body.password;
		   
		    this.User.findOne({email: email}, (err, user) => {
			    
		    	if(err){
					
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
					
		    	}else if(user){
		    		
		    		if(user.emailVerificationCode && user.emailVerificationCode === emailVerificationCode){
		    			
		    			//If it's the registration process, the passwordResetCode is equal to the verification code
		    			if(password){
			    			
			    			user.updatePassword(password, emailVerificationCode, (error, success) => {
				    			if(success){
					    			response.redirect("/views/login");
				    			}else{
					    			return next(error);
				    			}
			    			});
			    			
		    			}
		    		}else{
			    		return next(new this.errorController.errors.EmailVerificationCodeInvalidError());
		    		}
		    	}else{
			    	//it's safer to display the same error as above because this doesn't hint who's registered and who not
			    	return next(new this.errorController.errors.EmailVerificationCodeInvalidError());
		    	}
		    }); 
		};
		
		
		this.passport.use("client-basic", new BasicStrategy(
			(username, password, callback) => {
				this.OAuthClient.findOne({id: username}, (err, client) => {
					if(err){
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					}
					
					// No client found with that id or bad password
					if (!client){
						return callback(null, false);
					}
					
					client.verifySecret(password, (error, success) => {
						
						if(error){
							done(error, null);
						}
						
						if(success){
							return done(null, client);
						}else{
							return done(new this.errorController.errors.LoginError(), null);
						}
						
					});
				});
			}
		));
		
		this.isClientAuthenticated = passport.authenticate("client-basic", {session : false});
		
		
		
		//Setup the oath 2 server
		this.oauth2Server.serializeClient((client, callback) => {
			return callback(null, client._id);
		});
		
		this.oauth2Server.deserializeClient((id, callback) => {
			this.OAuthClient.findById(id, (err, client) => {
				if(err){
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				return callback(null, client);
			});
		});
		
		this.oauth2Server.grant(this.oauth2orize.grant.code((client, redirectUri, user, ares, callback) => {
			// Create a new authorization code
			
			if(!client.verifyRedirectUri(redirectUri)){
				return callback(new this.errorController.errors.InvalidRedirectUriError(), null);
			}
			
			let codeValue			= this.OAuthCode.generateCode();
			
			let expirationDate		= new Date();
			expirationDate.setSeconds(expirationDate.getSeconds() + this.config.AUTH_CODE_LIFETIME);
			
			let code = new this.OAuthCode({
				hash			: this.OAuthCode.hash(codeValue).hash,
				clientId		: client._id,
				userId			: user._id,
				expires			: expirationDate
			});
			
			// Save the auth code and check for errors
			code.save((err) => {
				if(err){
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				callback(null, codeValue);
			});
		}));
		
		this.oauth2Server.exchange(this.oauth2orize.exchange.code((client, code, redirectUri, callback) => {
			
			Code.findByCode(code, (err, authCode) => {
				
				if(err){
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				if (!authCode || client._id.toString() !== authCode.clientId || client.verifyRedirectUri(redirectUri)){
					return callback(new this.errorController.errors.AuthCodeInvalidError(), null);
				}
				
				let now = new Date();
				
				if(now >= authCode.expires){
					
					authCode.remove((err2) => {
						
						if(err2){
							return callback(new this.errorController.errors.DatabaseError({
								message: err2.message
							}), null);
						}
						
						return callback(new this.errorController.errors.AuthCodeExpiredError(), null);
						
					});
				}
				
				//Delete auth code now that it has been used
				authCode.remove((err2) => {
					
					if(err2){
						return callback(new this.errorController.errors.DatabaseError({
							message: err2.message
						}), null);
					}
					
					let expirationDate = new Date();
					expirationDate.setSeconds(expirationDate.getSeconds() + this.config.ACCESS_TOKEN_LIFETIME);
					
					// Create an access token
					let token = new this.OAuthAccessToken({
						hash			: this.OAuthAccessToken.generateToken(),
						clientId		: authCode.clientId,
						userId			: authCode.userId,
						expires			: expirationDate
					});
					
					// Save the access token and check for errors
					token.save((err3) => {
						
						if(err3){
							return callback(new this.errorController.errors.DatabaseError({
								message: err3.message
							}), null);
						}
						
						callback(null, token);
					});
				});
			});
		}));
		
		
		
		//Setup some accessible middlewares
		
		this.authorization = [
			this.oauth2Server.authorization((clientId, redirectUri, callback) => {
				this.OAuthClient.findById(clientId, (err, client) => {
					
					if(err){
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					if(client.verifyRedirectUri(redirectUri)){
						return callback(null, client, redirectUri);
					}else{
						return callback(new this.errorController.errors.InvalidRedirectUriError(), false);
					}
					
				});
				
			}),
			(request, response, done) => {
				//Check whether request qualifies for immediate approval
				
				let {client} = request.oauth2;
				
				//Or the user already approved to this client
				this.OAuthAccessToken.findOne({id: client.id}, (err, token) => {
					
					if(err){
						return done(new this.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					//If the client is trusted
					if(client.trusted === true || token){
						//pass it
						request.trusted = true;
					}else{
						request.trusted = false;
					}
					
					return done(null, false);
					
				})
				
			},
			(request, response) => {
				
				this.ejs.renderFile(__dirname + "/../views/OAuthDialog.ejs", {
					__					: (string) => {
						return this.i18n.__({phrase: string, locale: this.getLocale(request.user, request)});
					},
					
					transactionID		: request.oauth2.transactionID,
					user				: request.user,
					client				: request.oauth2.client,
					trusted				: request.trusted
					
				}, {}, (err, str) => {
					
					if(err){
						return next(new this.constructor.errorController.errors.RenderError({
							message: err.message
						}));
					}
					
				    response.setHeader("Content-Type", "text/html");
				    response.end(str);
				});
				
			}
		];
		
		this.decision	= [this.oauth2Server.decision()];
		this.token		= [this.oauth2Server.token(), this.oauth2Server.errorHandler()];
		
		
		this.passport.use("local", new LocalStrategy(
			(email, password, done) => {
				
				this.User.findOne({email: email}, (err, user) => {
					if(err){
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					}
					
					if(user.password.hash.length === 0 || !user) {
						return done(new this.errorController.errors.LoginError(), null);
					}
					
					user.verifyPassword(password, (error, success) => {
						
						if(error){
							done(error, null);
						}
						
						if(success){
							return done(null, user);
						}else{
							return done(new this.errorController.errors.LoginError(), null);
						}
					});
					
				});
			}
		));
		
		this.isAuthenticated = [
			(request, response, next) => {
				if(request.user){
					next();
				}else{
					request.session.requestedURL = request.url;
					return response.redirect("/views/login");
				}
			}
		];
		
		this.authLocal = (request, response, next) => {
			this.passport.authenticate("local", (err, user, info) => {
				
				this.auth(request, response, next, err, user, info);
				
			})(request, response, next);
		};
		
		//With OAuth
		passport.use(new BearerStrategy(
			
			(accessToken, callback) => {
				
				this.OAuthAccessToken.findByToken(accessToken, (err, token) => {
					if(err){
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					// No token found
					if (!token){
						return callback(new this.errorController.errors.TokenInvalidError(), false);
					}
					
					this.User.findById(token.userId, (err2, user) => {
						if(err2){
							return callback(new this.errorController.errors.DatabaseError({
								message: err2.message
							}), false);
						}
						
						// No user was found, so the token is invalid
						if(!user){
							token.remove((err3) => {
								
								if(err3){
									return callback(new this.errorController.errors.DatabaseError({
										message: err3.message
									}), false);
								}
								
								return callback(new this.errorController.errors.TokenInvalidError(), false);
							});
						}
						
						//no scopes yet
						return callback(null, user, { scope: "*" });
					});
				});	
			}
		));
		
		this.isBearerAuthenticated = this.passport.authenticate("bearer", {session: false});
		
		
				
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
					locale					: this.getLocale(null, request),
					placeOfResidence		: profile.user_location.name,
					
					facebook				: {
						friends					: profile.user_friends,
						accessToken				: accessToken,
						refreshToken			: refreshToken
					}
				}, done);
				
			})
		);
		
		this.authFacebook = [
			this.passport.authenticate("facebook", {
				scope : ['user_friends', 'user_location']
			})
		];
				
		
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
					locale					: this.getLocale(null, request),
					google					: {
						accessToken				: accessToken,
						refreshToken			: refreshToken
					}
				}, done);
				
			})
		);
		
		this.authGoogle = [
			this.passport.authenticate("google", {
				scope: ["openid profile email"]
			})
		];
		
	}
	
	loginView(request, response, next){
		this.ejs.renderFile(__dirname + "/../views/Login.ejs", {
			__					: (string) => {
				return this.i18n.__({phrase: string, locale: this.getLocale(request.user, request)});
			},
			
		}, {}, (err, str) => {
			
			if(err){
				return next(new this.constructor.errorController.errors.RenderError({
					message: err.message
				}));
			}
			
		    response.setHeader("Content-Type", "text/html");
		    response.end(str);
		});
	}
	
	mailVerificationView(request, response, next){
		this.ejs.renderFile(__dirname + "/../views/VerifyEmail.ejs", {
			
			__					: (string) => {
				return this.i18n.__({phrase: string, locale: this.getLocale(request.user, request)});
			},
			register			: (request.query.register === "true" ? true : false),
			email				: request.query.email,
			code				: request.query.code
			
		}, {}, (err, str) => {
			
			if(err){
				return next(new this.constructor.errorController.errors.RenderError({
					message: err.message
				}));
			}
			
		    response.setHeader("Content-Type", "text/html");
		    response.end(str);
		});
	}
	
	auth(request, response, next, err, user, info){
		
		if(err){
			return next(new this.errorController.errors.AuthenticationError({
				message: err.message
			}));
		}
		
		if(!user){
			return next(new this.errorController.errors.AuthenticationError({
				message: err.message
			}));
			//return response.redirect("/views/login");
		}
		
		request.logIn(user, (error) => {
			if(error){
				return next(error);
			}
			
			if(user){
				if(request.session.requestedURL){
					response.redirect(request.session.requestedURL);
				}else{
					response.end("logged in: " + request.session.requestedURL + ", max age: " + request.session.cookie.maxAge);
				}
				
			}else{
				return next(new this.errorController.errors.AuthenticationError());
			}
		});
	}
	
	authFacebookCallback(request, response, next){
		
		this.passport.authenticate("facebook", (err, user, info) => {
			
			this.auth(request, response, next, err, user, info);
			
		})(request, response, next);
		
	}
	
	authGoogleCallback(request, response, next){
		
		this.passport.authenticate("google", (err, user, info) => {
			
			this.auth(request, response, next, err, user, info);
			
		})(request, response, next);
		
	}
	
	catchInternalError(error, request, response, next){
		
		if(error){
			console.log(error);
			return response.redirect(this.config.LOGIN_PATH);
		}else{
			next();
		}
	}
	
	catchInternalErrorView(error, request, response, next){
		
		if(error){
			
			this.ejs.renderFile(__dirname + "/../views/Error.ejs", {
				
				__					: (string) => {
					return this.i18n.__({phrase: string, locale: this.getLocale(request.user, request)});
				},
				error				: error
				
			}, {}, (err, str) => {
				
				if(err){
					
					console.log(err);
					
					response.end("Internal Server Error");
				}
				
			    response.setHeader("Content-Type", "text/html");
			    response.end(str);
			});
		}else{
			next();
		}
	}
	
};

module.exports = AuthController;