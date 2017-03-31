/**
 * Defines the user structure
 */

const User = ({
	booki,						config,	sequelize,
	errorController,	i18n,		generateRandomString,
	generateHash,			models
}) => {

	const pick            = require('lodash/pick');
	const Sequelize		    = require('sequelize');
	const mailController  = new (require(
		'../controllers/MailController'
	))(booki);
	const EmailTemplate   = require('email-templates').EmailTemplate;

	let User = sequelize.define('user', {

		/* Name */

			nameDisplay: {
				type        : Sequelize.STRING,
			},
			nameFirst: {
				type        : Sequelize.STRING,
			},
			nameLast: {
				type        : Sequelize.STRING,
			},

		/* Email */

			emailVerified: {
				type         : Sequelize.STRING,
				unique       : true,
				validate     : {
					isEmail      : true
				}
			},

			emailUnverified: {
				type          : Sequelize.STRING,
				unique        : true,
				validate      : {
					isEmail       : true
				}
			},

			emailVerificationCode: {
				type         : Sequelize.STRING,
			},

		/* Password */

			passwordHash: {
				type          : Sequelize.STRING,
			},

			passwordSalt: {
				type          : Sequelize.STRING,
			},

			passwordAlgorithm: {
				type          : Sequelize.STRING,
			},

			passwordResetCode: {
				type          : Sequelize.STRING,
			},

			passwordResetCodeExpirationDate: {
				type          : Sequelize.DATE,
			},

		/* Locale */
			locale: {
				type          : Sequelize.STRING,
				default       : 'en-US',
				validate      : {
					isIn          : [config.LOCALES],
				}
			},

		/* Meta */

			placeOfResidence: {
				type          : Sequelize.STRING,
				default       : 'The milky way'
			},


	}, {
		defaultScope: {
			include: [
				{
					model   : models.Permission,
					as      : 'Permissions'
				},
				{
					model   : models.Image,
					as      : 'ProfilePicture'
				}
			]
		},

		classMethods: {
    	associate: function({
				Permission,   OAuthProvider, OAuthAccessToken,
				OAuthCode,    OAuthClient,   Image,
				Book,         Offer
			}){
				this.belongsToMany(Permission, {
					as          : 'Permissions',
					foreignKey  : 'user_id',
					otherKey    : 'permission_id',
					through     : 'permission_relations',
					onDelete    : 'cascade',
					hooks       : true
				});

				this.hasMany(OAuthProvider, {
					as         : 'OAuthProviders',
					foreignKey : 'user_id'
				});

				this.hasMany(OAuthClient, {
					as         : 'OAuthProviders',
					foreignKey : 'user_id'
				});

				this.hasMany(OAuthAccessToken, {
					as         : 'OAuthAccessTokens',
					foreignKey : 'user_id'
				});

				this.hasMany(OAuthCode, {
					as         : 'OAuthCodes',
					foreignKey : 'user_id'
				});

				this.hasMany(Image, {
					as         : 'Images',
					foreignKey : 'user_id'
				});

				this.belongsTo(Image,{
					as          : 'ProfilePicture',
					foreignKey  : 'profile_picture_id',
					constraints : false //otherwise we have a circular dependency
				});

				this.hasMany(Book, {
					as         : 'Books',
					foreignKey : 'user_id'
				});

				this.hasMany(Offer, {
					as         : 'Offers',
					foreignKey : 'user_id',
				});
			},

			getUserByPassportProfile: function(profile){
				return new Promise((resolve, reject) => {

					this.findOne({
						where: {emailVerified: {$in: profile.emails} }
					}).then((user) => {

						if(user){
							return resolve(user);
						}else{
							reject(new errorController.errors.UnexpectedQueryResultError());
						}

					}).catch((err) => {
						return reject(new errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				});
			},

			register: function(firstName, email, locale){
				return new Promise((resolve, reject) => {

					let lastName	= '';
					let names		= firstName.split(' ');

					if(names.length === 2){
						firstName	= names[0];
						lastName	= names[1];
					}

					let userData = {
						nameDisplay: firstName,
						nameFirst: firstName,

						permission : [],

						emailUnverified: email,
						emailVerificationCode : '',

						locale: locale,

					};

					this.findAll({
						where: { $or: [{emailVerified: email}, {emailUnverified: email}] }
					}).then((users) => {
						if(users && users.length > 0){

							return reject(
								new errorController.errors.UserAlreadyExistsError()
							);

						}else{
							this.create(userData).then((user) => {
								user.initEmailVerification(true).then(() => {
									resolve(user);
								}).catch((error) => {
									reject(error);
								});

							}).catch((err) => {
								return reject(new errorController.errors.DatabaseError({
									message: err.message
								}));
							});
						}

					}).catch((err) => {

						return reject(new errorController.errors.DatabaseError({
							message: err.message
						}));

					});
				});
			},

			findOrCreateUserByPassportProfile: function(profile){
				return new Promise((resolve, reject) => {

					this.getUserByPassportProfile(profile).then(() => {

						if(user){
							//update values for the current user
							user.updateFromPassportProfile(profile, customKeysAndVals);
						}else{
							//we have to create a new user
							user = this.createFromPassportProfile(profile, customKeysAndVals);
						}

						user.save().then((user) => {
							return resolve(user);

						}).catch((err) => {
							return reject(new errorController.errors.DatabaseError({
								message: err.message
							}));
						});

					}).catch((error) => {
						reject(error);
					});

				});
			},

			createFromPassportProfile: function(profile){
				let user = this.build({
					nameDisplay       : profile.displayName,
					nameFirst         : profile.givenName,
					nameLast          : profile.familyName,

					emailVerified     : profile.emails[0].value
				});

				//TODO mirror image
				let profilePicture = new models.Image.build({
					url: profile.photos[0].value
				});

				user.set('profilePicture', profilePicture);

				let promises = [];
				promises.push(profilePicture.save());
				promises.push(user.save());

				return Promise.all(promises);
			},

			updateFromPassportProfile: function(profile){
				this.set({
					nameDisplay       : profile.displayName,
					nameFirst         : profile.givenName,
					nameLast          : profile.familyName,
				});

				let promises = [];

				//TODO mirror image
				if(this.get('profilePicture').get('url') !== profile.photos[0].value){

					let profilePicture = new models.Image.build({
						url: profile.photos[0].value
					});

					this.setProfilePicture(profilePicture);

					promises.push(this.get('profilePicture').destroy());
					promises.push(profilePicture.save());
				}

				promises.push(this.save());

				return Promise.all(promises);
			},

  	},
  	instanceMethods: {

			sendMail: function(
				subject = '',
				html = '',
				text = '',
				toEmail = this.get('emailVerified'),
				cc = [],
				bcc = [],
				replyTo = null
			){
				return mailController.sendMail(
					['"' + this.get('nameFirst') + '" <' + toEmail + '>'],
					subject,
					html,
					text,
					cc,
					bcc,
					replyTo
				);
			},

			verifyPassword: function(password){
				return new Promise((resolve, reject) => {

					let {hash} = generateHash(
						password,
						this.get('passwordSalt'),
						this.get('passwordAlgorithm')
					);

					let {hash : newHash, newAlgorithm} = generateHash(
						password,
						this.get('passwordSalt')
					);

					if(hash == this.get('passwordHash')){
						//password is correct, check if the hash algorithm changed

						if(this.get('passwordAlgorithm') !== newAlgorithm){
							//yes it did, hash and store the password with the new algorithm one
							this.set('passwordHash',      newHash);
							this.set('passwordAlgorithm', newAlgorithm);
						}

						this.save().then((user) => {
							return resolve(true);
						}).catch((err) => {
							return reject(
								new errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});
					}else{
						return resolve(false);
					}
				});
			},

			updatePassword: function(password, passwordResetCode){
				return new Promise((resolve, reject) => {

					if(
						this.get('passwordResetCode') &&
						this.get('passwordResetCode') === passwordResetCode
					){

						if(this.get('passwordResetCodeExpirationDate') >= new Date()){

							let {hash, salt, algorithm} = generateHash(password);

							this.set({
								passwordHash			: hash,
								passwordSalt			: salt,
								passwordAlgorithm	: algorithm,
								passwordResetCode : ''
							});

							this.save().then((user) => {
								return resolve();

							}).catch((err) => {
								return reject(
									new errorController.errors.DatabaseError({
										message: err.message
									})
								);
							});

						}else{
							return reject(
								new errorController.errors
								.PasswordResetCodeExpiredError()
							);
						}
					}else{
						return reject(
							new errorController.errors
							.PasswordResetCodeInvalidError()
						);
					}
				});
			},

			initPasswordReset: function(){
				return new Promise((resolve, reject) => {

					let passwordResetCode	= generateRandomString(
						config.TOKEN_LENGTH
					);
					let resetMail = new EmailTemplate(
						__dirname + '/../templates/emails/password-reset'
					);

					let expirationDate =
						Date.now() + config.RESET_CODE_LIFETIME * 1000;

					this.set('passwordResetCode', passwordResetCode);
					this.set('passwordResetCodeExpirationDate', expirationDate);

					resetMail.render({
						user: this.get()
					}, this.get('locale'), (err, result) => {

						if(err){
							return reject(
								new errorController.errors.RenderError({
									message: err.message
								})
							);
						}

						this.sendMail(result.subject, result.html, result.text).then(() => {

							this.save((err, user) => {
								if(err){
									return reject(
										new errorController.errors.DatabaseError({
											message: err.message
										})
									);
								}

								return resolve(true);

							});

						}).catch((error) => {
							return reject(error);
						});

					});

				});
			},

			initEmailVerification: function(registration = false){
				return new Promise((resolve, reject) => {

					let emailVerificationCode	= generateRandomString(
						config.CONFIRM_TOKEN_LENGTH
					);
					let confirmationMail = new EmailTemplate(
						__dirname + '/../templates/emails/email-confirmation'
					);

					this.set('emailVerificationCode', emailVerificationCode);

					confirmationMail.render(
					{
						user					: this.get()
					},

					this.get('locale'), (err, result) => {

						if(err){
							return reject(
								new errorController.errors.RenderError({
									message: err.message
								})
							);
						}

						this.sendMail(
							result.subject,
							result.html,
							result.text,
							this.get('emailUnverified')
						).then(() => {

							this.set('emailVerificationCode', emailVerificationCode);

							if(registration){
								this.set('passwordResetCode', emailVerificationCode);
								this.set('passwordResetCodeExpirationDate',
									Date.now() + (config.RESET_CODE_LIFETIME * 1000)
								);
							}

							return this.save().then(() => {
								return resolve();

							}).catch((err) => {
								resolve(new errorController.errors.DatabaseError({
									message: err.message
								}));
							});

						}).catch((error) => {
							return reject(error);
						});
					});
				});
			},

			verifyEmail: function(
				email = '',
				emailVerificationCode = null
			){
				return new Promise((resolve, reject) => {

					if(
						email && emailVerificationCode &&
						this.get('emailVerificationCode') === emailVerificationCode &&
						this.get('emailUnverified') === email
					){

						this.set({
							emailVerified         : email,
							emailVerificationCode : '',
							emailUnverified       : null
						});

						return this.save().then(() => {

							return resolve();

						}).catch((err) => {
							return reject(
								new errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});

					}

					return reject(
						new errorController.errors.EmailVerificationCodeInvalidError(),
						false
					);

				});
			},

			getPermissionArray: function(){
				return this.get('Permissions').map((permission) => {
					return permission.get('permission');
				});
			},

			doesHavePermissions: function(permissionsNeeded = []){
				let permissions = this.getPermissionArray();

				let missing = permissionsNeeded.filter((permission) => {

					for(let i=0;i<permissions.length;i++){

						// has exactly this permission or has a higher level permission

						if(
							permission === permissions[i] ||
							permission.startsWith(permissions[i] + '.')
						){
							return false; //not missing, remove from array
						}
					}

					return true; //missing, leave in array

				});

				return missing.length === 0;
			},

			doesHavePermission: function(permission){
				return this.hasPermissions([permission]);
			},

    	toJSON: function(options = {}){
				let user = this.get(); //invoking virtual getters

				let json = pick(user, [
					'id', 'nameDisplay', 'nameFirst', 'nameLast',
					'createdAt', 'updatedAt'
				]);

				if(user.ProfilePicture){
					json.ProfilePicture = user.ProfilePicture.toJSON();
				}

		    json.permissions = this.getPermissionArray();


				if(options.hiddenData && options.hiddenData === true){
					json = Object.assign(json, pick(user, [
						'emailVerified', 'emailUnverified', 'emailVerificationCode',
						'passwordAlgorithm', 'passwordResetCode',
						'passwordResetCodeExpirationDate', 'locale', 'placeOfResidence'
					]));
		    }

				return json;
			}
		}
	});

	return User;

}

module.exports = User;
