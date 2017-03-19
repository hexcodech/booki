/**
 * Authenticates users
 */

class AuthController {

	constructor(
		{
			booki,            config,               i18n,
			models,           errorController,      passport,
			getLocale
		}
		){

		const bindAll          = require('lodash/bindAll');
		this.ejs               = require('ejs');
		this.oauth2orize       = require('oauth2orize');
		this.oauth2Server      = this.oauth2orize.createServer();

		const LocalStrategy    = require('passport-local').Strategy;
		const BearerStrategy   = require('passport-http-bearer').Strategy;
		const FacebookStrategy = require('passport-facebook').Strategy;
		const GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;

		//Store passed parameters
		this.config            = config;
		this.i18n              = i18n;
		this.errorController   = errorController;

		this.passport          = passport;

		this.getLocale         = getLocale;

		this.User              = models.User;
		this.OAuthClient       = models.OAuthClient;
		this.OAuthAccessToken  = models.OAuthAccessToken;
		this.OAuthCode         = models.OAuthCode;

		bindAll(this, [
			'loginView',							'mailVerificationView',	'auth',
			'authFacebookCallback', 	'authGoogleCallback',		'catchInternalError',
			'catchInternalErrorView',	'passwordResetView',		'initPasswordReset',
			'passwordReset',          'verifyEmail'
		]);

		//setup passport serialization
		this.passport.serializeUser((user, done) => {
			done(null, user.get('id'));
		});

		this.passport.deserializeUser((userId, done) => {

			this.User.findById(userId).then((user) => {
				done(null, user);
			}).catch((err) => {

				done(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			});

		});


		//Local registration
		this.registration = (request, response, next) => {

			let firstName		= request.body.firstName,
					email				= request.body.email,
					locale			= request.body.locale;

			if(!locale){
				locale = this.getLocale(null, request);
			}

			this.User.register(firstName, email, locale).then(() => {

				return response.redirect(
					'/views/verify-email?register=true&email=' + email
				);

			}).catch((error) => {
				next(error);
			});
		};

		//OAuth client authentication

		this.passport.use('client-local', new LocalStrategy(
			{usernameField: 'clientId', passwordField: 'clientSecret'},

			(clientId, clientSecret, callback) => {

				this.OAuthClient.findById(clientId).then((client) => {
					if(!client){
						return callback(null, false);
					}

					client.verifySecret(clientSecret).then(() => {
						return callback(null, client);
					}).catch((error) => {
						callback(error, null);
					});

				}).catch((err) => {

					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);

				});
			}
		));

		this.isClientAuthenticated = passport.authenticate(
			'client-local', {session : false}
		);

		//local password authentication

		this.passport.use('local', new LocalStrategy(
			(email, password, done) => {

				this.User.findOne({
					where: {emailVerified: email}
				}).then((user) => {

					if(!user || user.get('passwordHash').length === 0) {
						return done(new this.errorController.errors.LoginError(), null);
					}

					user.verifyPassword(password).then((success) => {
						return done(null, success ? user : null);
					}).catch((error) => {
						return done(error, null);
					});

				}).catch((err) => {
					return done(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				});
			}
		));

		this.isAuthenticated = [
			(request, response, next) => {
				if(request.user){
					next();
				}else{
					request.session.requestedURL = request.url;
					return response.redirect('/views/login');
				}
			}
		];

		this.authLocal = (request, response, next) => {
			this.passport.authenticate('local', (err, user, info) => {

				this.auth(request, response, next, err, user, info);

			})(request, response, next);
		};

		//Oauth token bearer
		passport.use(new BearerStrategy({
				passReqToCallback: true
			},
			(request, accessToken, callback) => {

				//keeping the database clean
				this.OAuthAccessToken.destroy({
					where: {expires: {$lt: new Date()} }
				}).then(() => {

					this.OAuthAccessToken.findByToken(accessToken).then((token) => {
						// No token found
						if (!token){
							return callback(
								new this.errorController.errors.TokenInvalidError(), false
							);
						}

						this.User.findById(token.userId).then((user) => {

							if(!user){
								// No user was found, so the token is invalid
								token.destroy().then(() => {
									return callback(
										new this.errorController.errors.TokenInvalidError(), false
									);
								}).catch((err) => {
									return callback(
										new this.errorController.errors.DatabaseError({
											message: err.message
										}), false
									);
								});
							}

							//check whether the user has the required permissions
							if(
								request.requiredPermissions &&
								user.hasPermissions(request.requiredPermissions)
							){
								//request.hasPermission not possible yet, as request.user
								//isn't set yet
								return callback(null, user);
							}

							return callback(
								new this.errorController.errors.ForbiddenError(), false
							);

						}).catch((err) => {
							return callback(new this.errorController.errors.DatabaseError({
								message: err.message
							}), false);
						});

					}).catch((err) => {
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					});

				}).catch((err) => {
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), false);
				});

			}
		));

		this.isBearerAuthenticated = (permissions = []) => {

			return (request, response, next) => {
				request.requiredPermissions = permissions;

				this.passport.authenticate(
					'bearer', {session: false}
				)(request, response, next);
			};

		};

		//With Facebook
		this.passport.use(
			new FacebookStrategy({
				clientID            : this.config.FACEBOOK_APP_ID,
				clientSecret        : this.config.FACEBOOK_APP_SECRET,
				callbackURL         : this.config.HOST +
				                      this.config.FACEBOOK_CALLBACK_PATH,

				profileFields       : ['user_friends', 'user_location'],
				passReqToCallback   : true
			},
			(request, accessToken, refreshToken, profile, done) => {
				//TODO update
				return;
				this.User.findOrCreateUserByPassportProfile(profile, {
					locale           : this.getLocale(null, request),
					placeOfResidence : profile.user_location.name,

					facebook          : {
						friends           : profile.user_friends,
						accessToken       : accessToken,
						refreshToken      : refreshToken
					}
				}).then((user) => {
					return done(null, user);

				}).catch((error) => {
					return done(error, null);
				});

			})
		);

		this.authFacebook = [
			this.passport.authenticate('facebook', {
				scope : ['user_friends', 'user_location']
			})
		];


		//With Google
		this.passport.use(
			new GoogleStrategy({
				clientID            : this.config.GOOGLE_CLIENT_ID,
				clientSecret        : this.config.GOOGLE_CLIENT_SECRET,
				callbackURL         : this.config.HOST +
                              this.config.GOOGLE_CALLBACK_PATH,

				passReqToCallback   : true
			},
			(request, accessToken, refreshToken, profile, done) => {
				//TODO update
				return;
				this.User.findOrCreateUserByPassportProfile(profile, {
					locale					: this.getLocale(null, request),
					google					: {
						accessToken				: accessToken,
						refreshToken			: refreshToken
					}
				}).then((user) => {
					return done(null, user);

				}).catch((error) => {
					return(error, null);
				});

			})
		);

		this.authGoogle = [
			this.passport.authenticate('google', {
				scope: ['openid profile email']
			})
		];


		//Setup the oauth 2 server
		this.oauth2Server.serializeClient((client, callback) => {
			return callback(null, client.get('id'));
		});

		this.oauth2Server.deserializeClient((id, callback) => {

			this.OAuthClient.findById(id).then((client) => {
				return callback(null, client);
			}).catch((err) => {
				return callback(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			});

		});

		this.oauth2Server.grant(this.oauth2orize.grant.code(
		(client, redirectUri, user, ares, callback) => {

			// Create a new authorization code

			if(!client.verifyRedirectUri(redirectUri)){
				return callback(
					new this.errorController.errors.InvalidRedirectUriError(), null
				);
			}

			let codeValue = this.OAuthCode.generateCode();

			let expirationDate = Date.now() + this.config.AUTH_CODE_LIFETIME * 1000;

			let code = this.OAuthCode.build({
				hash        : this.OAuthCode.hashCode(codeValue),
				expires     : expirationDate
			});

			let promises = [
				code.setUser(user), code.setOAuthClient(client), code.save()
			];

			// Save the auth code and check for errors
			Promise.all(promises).then(() => {
				return callback(null, codeValue);
			}).catch((err) => {
				return callback(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			});

		}));

		this.oauth2Server.exchange(this.oauth2orize.exchange.code(
		(client, code, redirectUri, callback) => {

			//keeping the database clean
			this.OAuthCode.destroy({where: {expires: {$lt: new Date()} }})
			.then(() => {

				this.OAuthCode.findByCode(code).then((authCode) => {
					//Delete the auth code now that it has been used
					let clientId = authCode.get('oauth_client_id'),
					    userId   = authCode.get('user_id');
					authCode.destroy().then(() => {

						let expirationDate = Date.now() +
																 this.config.ACCESS_TOKEN_LIFETIME * 1000;

						// Create an access token
						let tokenData = {
							token       : this.OAuthAccessToken.generateToken(),
							clientId    : clientId,
							userId      : userId,
							expires     : expirationDate
						};

						//the 'key' here is 'hash' and not 'token' as in 'tokenData'!
						let token = this.OAuthAccessToken.build({
							hash        : this.OAuthAccessToken.hashToken(tokenData.token),
							expires     : expirationDate
						});

						let promises = [
							token.setUser(userId), token.setOAuthClient(clientId),
							token.save()
						];

						// Save the access token and check for errors
						Promise.all(promises).then(() => {
							callback(null, tokenData);
						}).catch((err) => {
							return callback(new this.errorController.errors.DatabaseError({
								message: err.message
							}), null);
						});

					}).catch((err) => {
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					});
				}).catch((error) => {
					return callback(error);
				});
			}).catch((err) => {
				return callback(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			});

		}));


		//Setup some middleware

		this.authorization = [
			this.oauth2Server.authorization((clientId, redirectUri, callback) => {

				this.OAuthClient.findById(clientId)
				.then((client) => {

					if(client && client.verifyRedirectUri(redirectUri)){
						return callback(null, client, redirectUri);
					}else{
						return callback(
							new this.errorController.errors.InvalidRedirectUriError(), false
						);
					}

				}).catch((err) => {
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), false);
				});
			}),
			(request, response, next) => {
				//Check whether request qualifies for immediate approval

				let {client} = request.oauth2;

				//Or the user already approved to this client
				client.getOAuthAccessTokens().then((tokens) => {
					//If the client is trusted or there's already a token issued
					if(client.get('trusted') === true || tokens.length > 0){
						//pass it
						request.trusted = true;
					}else{
						request.trusted = false;
					}
					return next(null);

				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});

			},
			(request, response, next) => {

				this.ejs.renderFile(__dirname + '/../views/OAuthDialog.ejs', {
					__: (string) => {
						return this.i18n.__({
							phrase: string, locale: this.getLocale(request.user, request)
						});
					},

					transactionID  : request.oauth2.transactionID,
					user           : request.user,
					client         : request.oauth2.client,
					trusted        : request.trusted

				}, {}, (err, str) => {

					if(err){
						return next(
							new errorController.errors.RenderError({
								message: err.message
							})
						);
					}

					response.setHeader('Content-Type', 'text/html');
					response.end(str);
				});

			}
		];

		this.decision = [this.oauth2Server.decision()];
		this.token    = [
			this.oauth2Server.token(),
			this.oauth2Server.errorHandler()
		];

	}

	verifyEmail(request, response, next){

		let	email                  = request.body.email,
		    emailVerificationCode  = request.body.emailVerificationCode,
		    password               = request.body.password;

		this.User.findOne({where: {emailUnverified: email}}).then((user) => {
			user.verifyEmail(email, emailVerificationCode).then(() => {
				if(password){
					//still requires the password reset code so this should be safe
					user.updatePassword(password, emailVerificationCode).then(() => {
						response.redirect('/views/login');
					}).catch((error) => {
						next(error);
					});

				}else{
					response.redirect('/views/login');
				}

			}).catch((error) => {
				next(error);
			});

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

	loginView(request, response, next){
		this.ejs.renderFile(__dirname + '/../views/Login.ejs', {
			__         : (string) => {
				return this.i18n.__({
					phrase : string,
					locale : this.getLocale(request.user, request)
				});
			},

		}, {}, (err, str) => {

			if(err){
				return next(new errorController.errors.RenderError({
					message: err.message
				}));
			}

			response.setHeader('Content-Type', 'text/html');
			response.end(str);
		});
	}

	mailVerificationView(request, response, next){
		this.ejs.renderFile(__dirname + '/../views/VerifyEmail.ejs', {

			__         : (string) => {
				return this.i18n.__({
					phrase : string,
					locale : this.getLocale(request.user, request)
				});
			},
			register    : (request.query.register === 'true' ? true : false),
			email       : request.query.email,
			code        : request.query.code

		}, {}, (err, str) => {

			if(err){
				return next(new errorController.errors.RenderError({
					message: err.message
				}));
			}

			response.setHeader('Content-Type', 'text/html');
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
			//return response.redirect('/views/login');
		}

		request.logIn(user, (error) => {
			if(error){
				return next(error);
			}

			if(user){
				if(request.session.requestedURL){
					response.redirect(request.session.requestedURL);
				}else{
					response.end(
						'logged in: ' + request.session.requestedURL +
						', max age: ' + request.session.cookie.maxAge
					);
				}

			}else{
				return next(new this.errorController.errors.AuthenticationError());
			}
		});
	}

	authFacebookCallback(request, response, next){

		this.passport.authenticate('facebook', (err, user, info) => {

			this.auth(request, response, next, err, user, info);

		})(request, response, next);

	}

	authGoogleCallback(request, response, next){

		this.passport.authenticate('google', (err, user, info) => {

			this.auth(request, response, next, err, user, info);

		})(request, response, next);

	}

	initPasswordReset(request, response, next){
		this.User.findOne({
			where: {emailVerified: request.body.email}
		}).then((user) => {
			if(user){

				user.initPasswordReset().then(() => {
					return response.redirect(
						'/views/password-reset?email=' + request.body.email
					);
				}).catch((error) => {
					return next(error, null);
				});

			}else{
				//ALWAYS redirect to not leak whether this email is registered
				return response.redirect(
					'/views/password-reset?email=' + request.body.email
				);
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}), null);
		});
	}


	passwordResetView(request, response, next){
		this.ejs.renderFile(__dirname + '/../views/ResetPassword.ejs', {

			__         : (string) => {
				return this.i18n.__({
					phrase: string,
					locale: this.getLocale(request.user, request)
				});
			},
			email       : request.query.email,
			code        : request.query.code

		}, {}, (err, str) => {

			if(err){
				return next(new this.errorController.errors.RenderError({
					message: err.message
				}), null);
			}

			response.setHeader('Content-Type', 'text/html');
			response.end(str);
		});
	}

	passwordReset(request, response, next){
		this.User.findOne({
			where: {emailVerified: request.body.email}
		}).then(() => {
			if(user){
				user.updatePassword(request.body.password, request.body.resetCode)
				.then(() => {
					response.redirect('/views/login');

				}).catch((error) => {
					//Return always the same error to not leak whether this email
					//is registered
					return next(
						new this.errorController.errors.PasswordResetCodeInvalidError(),
						null
					);
				});
			}else{
				//Return always the same error to not leak whether this email
				//is registered
				return next(
					new this.errorController.errors.PasswordResetCodeInvalidError(),
					null
				);
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}), null);
		});
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

			this.ejs.renderFile(__dirname + '/../views/Error.ejs', {

				__         : (string) => {
					return this.i18n.__({
						phrase : string,
						locale : this.getLocale(request.user, request)
					});
				},
				error     : error

			}, {}, (err, str) => {

				if(err){

					console.log(err);
					response.end(
						`Yes, there was just an error while rendering the error...
						The original error was: ${JSON.stringify(error)}`
					);
				}

					response.setHeader('Content-Type', 'text/html');
					response.end(str);
			});
		}else{
			next();
		}
	}

};

module.exports = AuthController;
