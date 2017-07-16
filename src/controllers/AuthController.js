/**
 * Authenticates users
 */

class AuthController {
	constructor({ booki, config, i18n, models, passport, piwikTracker }) {
		const bindAll = require("lodash/bindAll");
		this.ejs = require("ejs");
		this.oauth2orize = require("oauth2orize");
		this.oauth2Server = this.oauth2orize.createServer();

		const LocalStrategy = require("passport-local").Strategy;
		const BearerStrategy = require("passport-http-bearer").Strategy;
		const FacebookStrategy = require("passport-facebook").Strategy;
		const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

		//Store passed parameters
		this.config = config;
		this.i18n = i18n;

		this.passport = passport;

		this.models = models;

		this.piwikTracker = piwikTracker;

		bindAll(this, [
			"loginView",
			"mailVerificationView",
			"auth",
			"authFacebookCallback",
			"authGoogleCallback",
			"catchInternalError",
			"catchInternalErrorView",
			"passwordResetView",
			"initPasswordReset",
			"passwordReset",
			"verifyEmail"
		]);

		//setup passport serialization
		this.passport.serializeUser((user, done) => {
			done(null, user.get("id"));
		});

		this.passport.deserializeUser((userId, done) => {
			this.models.User
				.findOne({
					where: { id: userId },
					include: [
						{
							model: this.models.Permission,
							as: "Permissions"
						}
					]
				})
				.then(user => {
					done(null, user);
				})
				.catch(done);
		});

		//Local registration
		this.registration = (request, response, next) => {
			let firstName = request.body.firstName,
				email = request.body.email,
				locale = request.body.locale;

			if (!locale) {
				locale = request.getLocale();
			}

			this.models.User
				.register(firstName, email, locale)
				.then(() => {
					this.piwikTracker.track({
						url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
						action_name: "Authentication/Registration",
						urlref: request.get("Referrer"),
						ua: this.config.PIWIK_TRACKING_USER_AGENT,
						uid: email
					});
					return response.redirect(
						"/views/verify-email?register=true&email=" + email
					);
				})
				.catch(next);
		};

		//OAuth client authentication

		this.passport.use(
			"client-local",
			new LocalStrategy(
				{ usernameField: "clientId", passwordField: "clientSecret" },
				(clientId, clientSecret, callback) => {
					this.models.OAuthClient
						.findOne({
							where: { id: clientId },
							include: [
								{
									model: models.OAuthRedirectUri,
									as: "OAuthRedirectUris"
								}
							]
						})
						.then(client => {
							if (!client) {
								return callback(null, false);
							}

							client
								.verifySecret(clientSecret)
								.then(() => {
									return callback(null, client);
								})
								.catch(err => {
									return callback(new Error("The secret is invalid!"));
								});
						})
						.catch(callback);
				}
			)
		);

		this.isClientAuthenticated = passport.authenticate("client-local", {
			session: false
		});

		//local password authentication

		this.passport.use(
			"local",
			new LocalStrategy((email, password, done) => {
				this.models.User
					.findOne({
						where: { emailVerified: email }
					})
					.then(user => {
						if (!user || user.get("passwordHash").length === 0) {
							return done(new Error("The user couldn't be found!"));
						}

						user
							.verifyPassword(password)
							.then(success => {
								return done(null, success ? user : null);
							})
							.catch(done);
					})
					.catch(done);
			})
		);

		this.isAuthenticated = [
			(request, response, next) => {
				if (request.user) {
					next();
				} else {
					request.session.requestedURL = request.url;
					return response.redirect("/views/login");
				}
			}
		];

		this.authLocal = (request, response, next) => {
			this.passport.authenticate("local", (err, user, info) => {
				this.piwikTracker.track({
					url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/AuthLocal",
					urlref: request.get("Referrer"),
					ua: this.config.PIWIK_TRACKING_USER_AGENT,
					uid: user.emailVerified
				});
				this.auth(request, response, next, err, user, info);
			})(request, response, next);
		};

		//Oauth token bearer
		passport.use(
			new BearerStrategy(
				{
					passReqToCallback: true
				},
				(request, accessToken, callback) => {
					//keeping the database clean
					this.models.OAuthAccessToken
						.destroy({
							where: { expires: { $lt: new Date() } }
						})
						.then(() => {
							return this.models.OAuthAccessToken
								.findByToken(accessToken)
								.then(token => {
									// No token found
									if (!token) {
										return callback(new Error("The sent token is invalid!"));
									}

									return this.models.User
										.findOne({
											where: { id: token.get("user_id") },
											include: [
												{
													model: this.models.Permission,
													as: "Permissions"
												}
											]
										})
										.then(user => {
											if (!user) {
												// No user was found, so the token is invalid
												return token.destroy().then(() => {
													return callback(
														new Error(
															"The sent token isn't associated with a user!"
														),
														false
													);
												});
											}

											//extend token lifetime
											token.set(
												"expires",
												Date.now() + this.config.ACCESS_TOKEN_LIFETIME * 1000
											);

											return token.save().then(() => {
												//check whether the user has the required permissions
												if (
													!request.requiredPermissions ||
													request.requiredPermissions.length === 0 ||
													(request.requiredPermissions &&
														user.doesHavePermissions(
															request.requiredPermissions
														))
												) {
													//request.hasPermission not possible yet, as request.user
													//isn't set yet
													return callback(null, user);
												}

												return callback(
													new Error(
														"You don't have the permission to do this!"
													),
													false
												);
											});
										});
								});
						})
						.catch(callback);
				}
			)
		);

		this.isBearerAuthenticated = (permissions = []) => {
			return (request, response, next) => {
				request.requiredPermissions = permissions;

				this.passport.authenticate(
					"bearer",
					{ session: false },
					(err, user, info) => {
						if (err) {
							return next(err);
						}

						if (!user) {
							return next(new Error("The sent access token is invalid!"));
						}

						request.logIn(user, next);
					}
				)(request, response, next);
			};
		};

		//With Facebook
		this.passport.use(
			new FacebookStrategy(
				{
					clientID: this.config.FACEBOOK_APP_ID,
					clientSecret: this.config.FACEBOOK_APP_SECRET,
					callbackURL: this.config.HOST + this.config.FACEBOOK_CALLBACK_PATH,

					passReqToCallback: true
				},
				(request, accessToken, refreshToken, profile, done) => {
					this.models.User
						.findOrCreateUserByPassportProfile(profile)
						.then(user => {
							user.set("locale", request.getLocale());
							return user
								.save()
								.then(user => {
									return user
										.getOAuthProviders({ where: { type: "facebook" } })
										.then(providers => {
											if (providers.length > 0) {
												let provider = providers[0];

												provider.set({
													accessToken,
													refreshToken
												});

												return provider.save();
											} else {
												return this.models.OAuthProvider
													.create({
														type: "facebook",
														accessToken,
														refreshToken
													})
													.then(provider => {
														return provider.setUser(user);
													});
											}
										});
								})
								.then(() => {
									return done(null, user);
								});
						})
						.catch(done);
				}
			)
		);

		this.authFacebook = [this.passport.authenticate("facebook")];

		//With Google
		this.passport.use(
			new GoogleStrategy(
				{
					clientID: this.config.GOOGLE_CLIENT_ID,
					clientSecret: this.config.GOOGLE_CLIENT_SECRET,
					callbackURL: this.config.HOST + this.config.GOOGLE_CALLBACK_PATH,

					passReqToCallback: true
				},
				(request, accessToken, refreshToken, profile, done) => {
					this.models.User
						.findOrCreateUserByPassportProfile(profile)
						.then(user => {
							user.set("locale", request.getLocale());
							return user
								.save()
								.then(user => {
									return user
										.getOAuthProviders({ where: { type: "google" } })
										.then(providers => {
											if (providers.length > 0) {
												let provider = providers[0];

												provider.set({
													accessToken,
													refreshToken
												});

												return provider.save();
											} else {
												return this.models.OAuthProvider
													.create({
														type: "google",
														accessToken,
														refreshToken
													})
													.then(provider => {
														return provider.setUser(user);
													});
											}
										});
								})
								.then(() => {
									return done(null, user);
								});
						})
						.catch(done);
				}
			)
		);

		this.authGoogle = [
			this.passport.authenticate("google", {
				scope: ["openid profile email"]
			})
		];

		//Setup the oauth 2 server
		this.oauth2Server.serializeClient((client, callback) => {
			return callback(null, client.get("id"));
		});

		this.oauth2Server.deserializeClient((id, callback) => {
			this.models.OAuthClient
				.findOne({
					where: { id: id },
					include: [
						{
							model: this.models.OAuthRedirectUri,
							as: "OAuthRedirectUris"
						}
					]
				})
				.then(client => {
					return callback(null, client);
				})
				.catch(callback);
		});

		this.oauth2Server.grant(
			this.oauth2orize.grant.code(
				(client, redirectUri, user, ares, callback) => {
					// Create a new authorization code

					if (!client.verifyRedirectUri(redirectUri)) {
						return callback(
							new Error(
								"The sent redirect uri isn't registered with this oauth client!"
							)
						);
					}

					let codeValue = this.models.OAuthCode.generateCode();

					let expirationDate =
						Date.now() + this.config.AUTH_CODE_LIFETIME * 1000;

					let code = this.models.OAuthCode.build({
						hash: this.models.OAuthCode.hashCode(codeValue),
						expires: expirationDate,
						user_id: user.get("id"),
						oauth_client_id: client.get("id")
					});

					let promises = [code.save()];

					// Save the auth code and check for errors
					Promise.all(promises)
						.then(() => {
							return callback(null, codeValue);
						})
						.catch(callback);
				}
			)
		);

		this.oauth2Server.exchange(
			this.oauth2orize.exchange.code((client, code, redirectUri, callback) => {
				this.models.OAuthCode
					.findByCode(code)
					.then(authCode => {
						if (authCode.get("expires") < Date.now()) {
							return callback(
								new Error("The sent auth code has already expired!")
							);
						}
						//Delete the auth code now that it has been used
						let clientId = authCode.get("oauth_client_id"),
							userId = authCode.get("user_id");

						let promises = [
							this.models.OAuthCode.destroy({
								where: {
									$or: [
										{
											expires: { $lt: new Date() }
										},
										{
											id: authCode.get("id")
										}
									]
								}
							})
						];

						let expirationDate =
							Date.now() + this.config.ACCESS_TOKEN_LIFETIME * 1000;

						// Create an access token
						let tokenData = {
							token: this.models.OAuthAccessToken.generateToken(),
							clientId: clientId,
							userId: userId,
							expires: expirationDate
						};

						//the 'key' here is 'hash' and not 'token' as in 'tokenData'!
						promises.push(
							this.models.OAuthAccessToken.create({
								hash: this.models.OAuthAccessToken.hashToken(tokenData.token),
								expires: expirationDate,
								user_id: userId,
								oauth_client_id: clientId
							})
						);

						Promise.all(promises)
							.then(() => {
								callback(null, tokenData);
							})
							.catch(callback);
					})
					.catch(callback);
			})
		);

		//Setup some middleware

		this.authorization = [
			this.oauth2Server.authorization((clientId, redirectUri, callback) => {
				this.models.OAuthClient
					.findOne({
						where: { id: clientId },
						include: [
							{
								model: this.models.OAuthRedirectUri,
								as: "OAuthRedirectUris"
							}
						]
					})
					.then(client => {
						if (client && client.verifyRedirectUri(redirectUri)) {
							return callback(null, client, redirectUri);
						} else {
							return callback(
								new Error(
									"The sent redirect uri isn't registered with this oauth client!"
								)
							);
						}
					})
					.catch(callback);
			}),
			(request, response, next) => {
				//Check whether request qualifies for immediate approval

				let { client } = request.oauth2;

				//Or the user already approved to this client
				client
					.getOAuthAccessTokens()
					.then(tokens => {
						//If the client is trusted or there's already a token issued
						if (client.get("trusted") === true || tokens.length > 0) {
							//pass it
							request.trusted = true;
						} else {
							request.trusted = false;
						}
						return next(null);
					})
					.catch(next);
			},
			(request, response, next) => {
				this.ejs.renderFile(
					__dirname + "/../views/OAuthDialog.ejs",
					{
						__: string => {
							return this.i18n.__({
								phrase: string,
								locale: request.getLocale()
							});
						},

						transactionID: request.oauth2.transactionID,
						user: request.user,
						client: request.oauth2.client,
						trusted: request.trusted
					},
					{},
					(err, str) => {
						if (err) {
							return next(err);
						}

						response.setHeader("Content-Type", "text/html");
						response.end(str);
					}
				);
			}
		];

		this.decision = [this.oauth2Server.decision()];
		this.token = [this.oauth2Server.token(), this.oauth2Server.errorHandler()];
	}

	verifyEmail(request, response, next) {
		let email = request.body.email,
			emailVerificationCode = request.body.emailVerificationCode,
			password = request.body.password;

		this.models.User
			.findOne({ where: { emailUnverified: email } })
			.then(user => {
				user
					.verifyEmail(email, emailVerificationCode)
					.then(() => {
						if (password) {
							//still requires the password reset code so this should be safe
							user
								.updatePassword(password, emailVerificationCode)
								.then(() => {
									this.piwikTracker.track({
										url:
											this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
										action_name: "Authentication/VerifyEmail",
										urlref: request.get("Referrer"),
										ua: this.config.PIWIK_TRACKING_USER_AGENT,
										uid: email
									});
									response.redirect("/views/login");
								})
								.catch(next);
						} else {
							response.redirect("/views/login");
						}
					})
					.catch(next);
			})
			.catch(next);
	}

	loginView(request, response, next) {
		this.ejs.renderFile(
			__dirname + "/../views/Login.ejs",
			{
				__: string => {
					return this.i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				}
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				this.piwikTracker.track({
					url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/Login View",
					urlref: request.get("Referrer"),
					ua: this.config.PIWIK_TRACKING_USER_AGENT
				});

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	}

	mailVerificationView(request, response, next) {
		this.ejs.renderFile(
			__dirname + "/../views/VerifyEmail.ejs",
			{
				__: string => {
					return this.i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				},
				register: request.query.register === "true" ? true : false,
				email: request.query.email,
				code: request.query.code
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				this.piwikTracker.track({
					url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/MailVerification View",
					urlref: request.get("Referrer"),
					ua: this.config.PIWIK_TRACKING_USER_AGENT
				});

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	}

	auth(request, response, next, err, user, info) {
		if (err) {
			return next(err);
		}

		if (!user) {
			return next(new Error("Couldn't find a user!"));
		}

		request.logIn(user, err => {
			if (err) {
				return next(err);
			}

			if (request.session.requestedURL) {
				response.redirect(request.session.requestedURL);
			} else {
				response.redirect(this.config.DEFAULT_REDIRECT_URI);
			}
		});
	}

	authFacebookCallback(request, response, next) {
		this.passport.authenticate("facebook", (err, user, info) => {
			if (!err && user) {
				this.piwikTracker.track({
					url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/FacebookLogin",
					urlref: request.get("Referrer"),
					ua: this.config.PIWIK_TRACKING_USER_AGENT,
					uid: user.get("emailVerified")
				});
			}

			this.auth(request, response, next, err, user, info);
		})(request, response, next);
	}

	authGoogleCallback(request, response, next) {
		this.passport.authenticate("google", (err, user, info) => {
			if (!err && user) {
				this.piwikTracker.track({
					url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/GoogleLogin",
					urlref: request.get("Referrer"),
					ua: this.config.PIWIK_TRACKING_USER_AGENT,
					uid: user.get("emailVerified")
				});
			}

			this.auth(request, response, next, err, user, info);
		})(request, response, next);
	}

	initPasswordReset(request, response, next) {
		this.models.User
			.findOne({
				where: { emailVerified: request.body.email }
			})
			.then(user => {
				if (user) {
					let user = user;
					user
						.initPasswordReset()
						.then(() => {
							return response.redirect(
								"/views/password-reset?email=" + request.body.email
							);
						})
						.catch(next);
				} else {
					//ALWAYS redirect to not leak whether this email is registered
					return response.redirect(
						"/views/password-reset?email=" + request.body.email
					);
				}
			})
			.catch(next);
	}

	passwordResetView(request, response, next) {
		this.ejs.renderFile(
			__dirname + "/../views/ResetPassword.ejs",
			{
				__: string => {
					return this.i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				},
				email: request.query.email,
				code: request.query.code
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				this.piwikTracker.track({
					url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/PasswordReset View",
					urlref: request.get("Referrer"),
					ua: this.config.PIWIK_TRACKING_USER_AGENT
				});

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	}

	passwordReset(request, response, next) {
		this.models.User
			.findOne({
				where: { emailVerified: request.body.email }
			})
			.then(() => {
				if (user) {
					let user = user;
					user
						.updatePassword(request.body.password, request.body.resetCode)
						.then(() => {
							this.piwikTracker.track({
								url: this.config.PIWIK_TRACKING_SITE_BASE_URL + request.path,
								action_name: "Authentication/PasswordReset",
								urlref: request.get("Referrer"),
								ua: this.config.PIWIK_TRACKING_USER_AGENT,
								uid: user.emailVerified
							});
							response.redirect("/views/login");
						})
						.catch(next);
				} else {
					//Return always the same error to not leak whether this email
					//is registered
					return next(new Error("The password reset code was invalid!"));
				}
			})
			.catch(next);
	}

	catchInternalError(err, request, response, next) {
		if (err) {
			response.redirect(this.config.LOGIN_PATH);
			throw err;

			return;
		} else {
			next();
		}
	}

	catchInternalErrorView(err, request, response, next) {
		if (err) {
			this.ejs.renderFile(
				__dirname + "/../views/Error.ejs",
				{
					__: string => {
						return this.i18n.__({
							phrase: string,
							locale: request.getLocale()
						});
					},
					error: err
				},
				{},
				(err, str) => {
					if (err2) {
						response.end(
							"Yes, there was just an error while rendering the error..."
						);

						console.log(`The original error was: ${JSON.stringify(err)}
						and the new one is: ${JSON.stringify(err2)}`);

						throw err;

						return;
					}

					response.setHeader("Content-Type", "text/html");
					response.end(str);
				}
			);
		} else {
			next();
		}
	}
}

module.exports = AuthController;
