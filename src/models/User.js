/**
 * Defines the user structure
 */

const User = ({ config, sequelize, models, cryptoUtilities }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");
	const async = require("async");
	const request = require("request-promise-native");

	const EmailTemplate = require("email-templates").EmailTemplate;
	const mailController = new (require("../controllers/MailController"))(config);

	let User = sequelize.define(
		"user",
		{
			/* Name */

			nameDisplay: {
				type: Sequelize.STRING,
				default: ""
			},
			nameFirst: {
				type: Sequelize.STRING,
				default: ""
			},
			nameLast: {
				type: Sequelize.STRING,
				default: ""
			},

			/* Email */

			emailVerified: {
				type: Sequelize.STRING,
				unique: true,
				validate: {
					isEmail: true
				}
			},

			emailUnverified: {
				type: Sequelize.STRING,
				unique: true,
				validate: {
					isEmail: true
				}
			},

			emailVerificationCode: {
				type: Sequelize.STRING
			},

			/* Password */

			passwordHash: {
				type: Sequelize.STRING
			},

			passwordSalt: {
				type: Sequelize.STRING
			},

			passwordAlgorithm: {
				type: Sequelize.STRING
			},

			passwordResetCode: {
				type: Sequelize.STRING
			},

			passwordResetCodeExpirationDate: {
				type: Sequelize.DATE
			},

			/* Locale */
			locale: {
				type: Sequelize.STRING,
				default: "en-US",
				validate: {
					isIn: [config.LOCALES]
				}
			}
		},
		{
			charset: "utf8",
			collate: "utf8_unicode_ci",
			defaultScope: {
				/*include: [
					{
						model: models.Permission,
						as: "Permissions"
					},
					{
						model: models.Image,
						as: "ProfilePicture"
					},
					{
						model: models.OAuthProvider,
						as: "OAuthProviders"
					}
				]*/
			}
		}
	);

	User.associate = function({
		Permission,
		OAuthProvider,
		OAuthAccessToken,
		OAuthCode,
		OAuthClient,
		Image,
		Book,
		Offer,
		OfferRequest
	}) {
		this.belongsToMany(Permission, {
			as: "Permissions",
			foreignKey: "user_id",
			otherKey: "permission_id",
			through: "permission_relations",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthProvider, {
			as: "OAuthProviders",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthAccessToken, {
			as: "OAuthAccessTokens",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthCode, {
			as: "OAuthCodes",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthClient, {
			as: "OAuthClients",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(Image, {
			as: "Images",
			foreignKey: "user_id"
		});

		this.belongsTo(Image, {
			as: "ProfilePicture",
			foreignKey: "profile_picture_id",
			constraints: false //otherwise we have a circular dependency
		});

		this.hasMany(Book, {
			as: "Books",
			foreignKey: "user_id"
		});

		this.hasMany(Offer, {
			as: "Offers",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OfferRequest, {
			as: "OfferRequests",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});
	};

	User.getUserByPassportProfile = function(profile) {
		return this.findOne({
			where: {
				emailVerified: { $in: profile.emails.map(obj => obj.value) }
			}
		});
	};

	User.register = function(firstName, email, locale) {
		let lastName = "";
		let names = firstName.split(" ");

		if (names.length === 2) {
			firstName = names[0];
			lastName = names[1];
		}

		let userData = {
			nameDisplay: firstName,
			nameFirst: firstName,

			permission: [],

			emailUnverified: email,
			emailVerificationCode: "",

			locale: locale
		};

		return this.findAll({
			where: {
				$or: [{ emailVerified: email }, { emailUnverified: email }]
			}
		}).then(users => {
			if (users && users.length > 0) {
				return Promise.reject("This email is already registered!");
			} else {
				return this.create(userData).then(user => {
					user.initEmailVerification(true).then(() => {
						return user;
					});
				});
			}
		});
	};

	User.findOrCreateUserByPassportProfile = function(profile) {
		return this.getUserByPassportProfile(profile).then(user => {
			if (user) {
				//update values for the current user
				return user.updateFromPassportProfile(profile);
			} else {
				//we have to create a new user
				return this.createFromPassportProfile(profile);
			}
		});
	};

	User.createFromPassportProfile = function(profile) {
		let user = this.build({
			nameDisplay: profile.displayName,
			nameFirst: profile.givenName,
			nameLast: profile.familyName,

			emailVerified: profile.emails[0].value
		});

		let url = profile.photos[0].value;
		if (url.indexOf("?sz=50") !== -1) {
			url = url.replace("?sz=50", "?sz=500");
		}

		return user
			.save()
			.then(user => {
				return request
					.get({ uri: url, encoding: null })
					.then(buffer => {
						return models.Image.store(buffer, user);
					})
					.then(image => {
						return user.setProfilePicture(image);
					});
			})
			.then(() => {
				return user.reload();
			});
	};

	User.prototype.updateFromPassportProfile = function(profile) {
		this.set({
			nameDisplay: profile.displayName,
			nameFirst: profile.givenName,
			nameLast: profile.familyName
		});

		let url = profile.photos[0].value;
		if (url.indexOf("?sz=50") !== -1) {
			url = url.replace("?sz=50", "?sz=500");
		}

		return this.save()
			.then(user => {
				return request
					.get({ uri: url, encoding: null })
					.then(buffer => {
						return models.Image.store(buffer, user);
					})
					.then(image => {
						return user.setProfilePicture(image);
					});
			})
			.then(() => {
				return this.reload();
			});
	};

	User.prototype.sendMail = function(
		subject = "",
		html = "",
		text = "",
		toEmail = this.get("emailVerified"),
		cc = [],
		bcc = [],
		replyTo = null
	) {
		return mailController.sendMail(
			['"' + this.get("nameFirst") + '" <' + toEmail + ">"],
			subject,
			html,
			text,
			cc,
			bcc,
			replyTo
		);
	};

	User.prototype.verifyPassword = function(password) {
		let { hash } = cryptoUtilities.generateHash(
			password,
			this.get("passwordSalt"),
			this.get("passwordAlgorithm")
		);

		let { hash: newHash, newAlgorithm } = cryptoUtilities.generateHash(
			password,
			this.get("passwordSalt")
		);

		if (hash == this.get("passwordHash")) {
			//password is correct, check if the hash algorithm changed

			if (this.get("passwordAlgorithm") !== newAlgorithm) {
				//yes it did, hash and store the password with the new algorithm one
				this.set("passwordHash", newHash);
				this.set("passwordAlgorithm", newAlgorithm);
			}

			return this.save().then(user => {
				return true;
			});
		} else {
			return false;
		}
	};

	User.prototype.updatePassword = function(password, passwordResetCode) {
		if (
			this.get("passwordResetCode") &&
			this.get("passwordResetCode") === passwordResetCode
		) {
			if (this.get("passwordResetCodeExpirationDate") >= new Date()) {
				let { hash, salt, algorithm } = cryptoUtilities.generateHash(password);

				this.set({
					passwordHash: hash,
					passwordSalt: salt,
					passwordAlgorithm: algorithm,
					passwordResetCode: ""
				});

				return this.save().then(user => {
					return;
				});
			} else {
				return Promise.reject(
					new Error("The password reset code has already expired!")
				);
			}
		} else {
			return Promise.reject(new Error("The password reset code is invalid!"));
		}
	};

	User.prototype.initPasswordReset = function() {
		let passwordResetCode = cryptoUtilities.generateRandomString(
			config.TOKEN_LENGTH
		);
		let resetMail = new EmailTemplate(
			__dirname + "/../templates/emails/password-reset"
		);

		let expirationDate = Date.now() + config.RESET_CODE_LIFETIME * 1000;

		this.set("passwordResetCode", passwordResetCode);
		this.set("passwordResetCodeExpirationDate", expirationDate);

		return resetMail
			.render(
				{
					user: this.get()
				},
				this.get("locale")
			)
			.then(result => {
				return this.sendMail(
					result.subject,
					result.html,
					result.text
				).then(() => {
					return this.save().then(() => {
						return true;
					});
				});
			});
	};

	User.prototype.initEmailVerification = function(registration = false) {
		let emailVerificationCode = cryptoUtilities.generateRandomString(
			config.CONFIRM_TOKEN_LENGTH
		);
		let confirmationMail = new EmailTemplate(
			__dirname + "/../templates/emails/email-confirmation"
		);

		this.set("emailVerificationCode", emailVerificationCode);

		return confirmationMail
			.render(
				{
					user: this.get()
				},
				this.get("locale")
			)
			.then(result => {
				return this.sendMail(
					result.subject,
					result.html,
					result.text,
					this.get("emailUnverified")
				).then(() => {
					this.set("emailVerificationCode", emailVerificationCode);

					if (registration) {
						this.set("passwordResetCode", emailVerificationCode);
						this.set(
							"passwordResetCodeExpirationDate",
							Date.now() + config.RESET_CODE_LIFETIME * 1000
						);
					}

					return this.save().then(() => {
						return true;
					});
				});
			});
	};

	User.prototype.verifyEmail = function(
		email = "",
		emailVerificationCode = null
	) {
		if (
			email &&
			emailVerificationCode &&
			this.get("emailVerificationCode") === emailVerificationCode &&
			this.get("emailUnverified") === email
		) {
			this.set({
				emailVerified: email,
				emailVerificationCode: "",
				emailUnverified: null
			});

			return this.save().then(() => {
				return true;
			});
		} else {
			return Promise.reject(
				new Error("The email verification code is invalid!")
			);
		}
	};

	User.prototype.getPermissionArray = function() {
		if (!this.get("Permissions")) {
			console.log(
				new Error("Permissions weren't included in this instance of User!")
			);
			return [];
		}
		return this.get("Permissions").map(permission => {
			return permission.get("permission");
		});
	};

	User.prototype.doesHavePermissions = function(permissionsNeeded = []) {
		let permissions = this.getPermissionArray();

		let missing = permissionsNeeded.filter(permission => {
			for (let i = 0; i < permissions.length; i++) {
				// has exactly this permission or has a higher level permission

				if (
					permission === permissions[i] ||
					permission.startsWith(permissions[i] + ".")
				) {
					return false; //not missing, remove from array
				}
			}

			return true; //missing, leave in array
		});

		return missing.length === 0;
	};

	User.prototype.doesHavePermission = function(permission) {
		return this.doesHavePermissions([permission]);
	};

	User.prototype.setPermissionsRaw = function(permissions) {
		return new Promise((resolve, reject) => {
			let permissionInstances = [];

			async.each(
				permissions,
				(permission, callback) => {
					models.Permission
						.findOrCreate({
							where: { permission: permission },
							defaults: { permission: permission }
						})
						.then(result => {
							let promises = [];
							let permissionInstance = result[0],
								created = result[1];

							permissionInstances.push(permissionInstance);
							callback();
						})
						.catch(err => {
							return callback(err);
						});
				},
				err => {
					if (err) {
						throw err;
					}

					this.setPermissions(permissionInstances)
						.then(() => {
							resolve(true);
						})
						.catch(err => {
							reject(err);
						});
				}
			);
		});
	};

	User.prototype.toJSON = function(options = {}) {
		let user = this.get();

		let json = pick(user, [
			"id",
			"nameDisplay",
			"nameFirst",
			"nameLast",
			"createdAt",
			"updatedAt"
		]);

		json.thumbnails = [];
		json.profilePictureId = user.profile_picture_id;

		if (user.ProfilePicture) {
			json.thumbnails = user.ProfilePicture.getThumbnailsRaw();
		}

		if (user.Offers) {
			json.offers = user.Offers.map(offer => {
				return offer.toJSON(options);
			});
		}

		if (user.OfferRequests) {
			json.offerRequests = user.OfferRequests.map(offerRequest => {
				return offerRequest.toJSON(options);
			});
		}

		if (options.admin) {
			json.permissions = this.getPermissionArray();

			json = Object.assign(
				json,
				pick(user, [
					"emailVerified",
					"emailUnverified",
					"emailVerificationCode",
					"passwordAlgorithm",
					"passwordResetCode",
					"passwordResetCodeExpirationDate",
					"locale"
				])
			);
		} else if (options.owner) {
			json.permissions = this.getPermissionArray();

			json = Object.assign(
				json,
				pick(user, [
					"emailVerified",
					"emailUnverified",
					"passwordAlgorithm",
					"locale"
				])
			);
		}

		return json;
	};

	return User;
};

module.exports = User;
