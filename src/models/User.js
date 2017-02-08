/**
 * Defines the user structure
 */
 
function User({booki, config, mongoose, errorController, i18n, generateRandomString, hash}){
	
	
	//setup some values
	let userSchema = new mongoose.Schema({
		name						: {
			display						: {type: String, required: true},
			first						: {type: String, required: true},
			last						: {type: String, required: false},
		},
		
		email						: {
			verified					: {type: String, unique: true,	required: false},
			unverified					: {type: String, unique: false, required: false},
			verificationCode			: {type: String, default: "",	required: false},
		},
		
		password					: {
			hash						: {type: String, default: "",	required: false},
			salt						: {type: String, default: "",	required: false},
			algorithm					: {type: String, default: "",	required: false},
			
			resetCode					: {type: String, default: "",	required: false},
			resetCodeExpirationDate		: {type: Date,					required: false},
		},
		
		permissions					: {type: Array, default: [],		required: false},
		
		locale						: {type: String, default: "en",		required: true},
		placeOfResidence			: {type: String, required: false},
		
		created						: {type: Date, default: Date.now,	required: true},
		
		profilePictureUrl			: {
			type: String,
			"default": "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mm&s=512",
			required: true
			//https://de.gravatar.com/site/implement/images/
		},
		
		facebook					: {
			friends						: {type: Array, required: false},
			
			accessToken					: {type: String, default: "", required: false},
			refreshToken				: {type: String, default: "", required: false},
		},
		
		google						: {
			accessToken					: {type: String, default: "", required: false},
			refreshToken				: {type: String, default: "", required: false},
		},
	});
	
	userSchema.statics.config				= config;
	userSchema.statics.errorController		= errorController;
	userSchema.statics.generateRandomString	= generateRandomString;
	userSchema.statics.hash					= hash;
	
	userSchema.statics.mailController		= new (require("../controllers/MailController"))(booki);
	userSchema.statics.EmailTemplate		= require("email-templates").EmailTemplate;
		
	/**
	 * Finds a matching user to the passed passport profile
	 * @function getUserByPassportProfile
	 * @param {Object} profile - The passport profile to base the new user on
	 * @param {Function} callback - The function to execute when this function found a user
	 * @returns {undefined} - The data is returned with the callback parameter
	 */
	userSchema.statics.getUserByPassportProfile = function(profile, callback){
		
		const iterateMails = (emails, index) => {
			
			this.findOne({"email.verified": emails[index].value}, (err, user) => {
				
				if(err){
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				if(user){
					return callback(null, user);
				}
				
				index++;
				
				if(index < emails.length){
					iterateMails(emails, index);
				}else{
					callback(null, null);
				}
				
			});
			
		}
		
		iterateMails(profile.emails, 0);
	}
	
	/**
	 * Registers a new user
	 * @function register
	 * @param {Object} profile - The passport profile to base the new user on
	 * @param {Function} callback - The function to execute when this function found a user
	 * @returns {undefined} - The data is returned with the callback parameter
	 */
	userSchema.statics.register = function(firstName, email, locale, callback){
		
		let lastName = "";
		let names = firstName.split(" ");
		
		if(names.length === 2){
			firstName	= names[0];
			lastName	= names[1];
		}
		
		var userData = {
			name						: {
				display						: firstName,
				first						: firstName
			},
			
			permissions					: [],
			
			email						: {
				unverified					: email,
				verificationCode			: ""
			},
			
			locale						: locale,
			
		};
		
		var user = new this(userData);
		
		this.find({$or: [{"email.verified": email}, {"email.unverified": email}]}, (err, users) => {
			
			if(err){
				return callback(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(users && users.length > 0){
				
				return callback(new this.errorController.errors.UserAlreadyExistsError(), null);
				
			}else{
				user.save((err) => {
					
					if(err){
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					}
					
					user.initEmailVerification((error, success) => {
						if(error){
							return callback(error, false);
						}
						return callback(null, user);
						
					}, true);
				});
			}
		});
	}
	
	/**
	 * Finds or creates a matching user to the passed passport profile
	 * @function findOrCreateUserByPassportProfile
	 * @param {Object} profile - The passport profile to base the new user on
	 * @param {Object} customKeysAndVals The custom keys and values used to find or create the user
	 * @param {Function} callback - The function to execute when this function found a user
	 * @returns {undefined} - The data is returned with the callback parameter
	 */
	userSchema.statics.findOrCreateUserByPassportProfile = function(profile, customKeysAndVals, callback){
		
		this.getUserByPassportProfile(profile, (errorObj, user) => {
			
			if(errorObj){
				return callback(errorObj, null);
			}
			
			if(user){
				//update values for the current user
				user.updateFromPassportProfile(profile, customKeysAndVals);
			}else{
				//we have to create a new user
				user = this.createFromPassportProfile(profile, customKeysAndVals);
			}
			
			user.save((err) => {
				if(err){
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				return callback(null, user);
			});
		});
	}
	
	/**
	 * Creates an object including the keys and values needed to
	 * create a new user based on the passed passport object
	 * @function getPassportUserMappings
	 * @param {Object} profile - The passport profile to base the new user on
	 * @returns {Object} - The user keys and values that can be used to create a user
	 */
	userSchema.statics.getPassportUserMappings = function(profile){
		
		return {
			name					: {
				display					: profile.displayName,
				first					: profile.name.givenName,
				last					: profile.name.familyName
			},
			
			/*email					: {
				verified				: profile.emails[0].value // shouldn't be updated without the user wanting it
			}*/
			
			profilePictureURL		: profile.photos[0].value
		};
	}
	
	/**
	 * Creates a new user based on the passed passport profile and the passed custom keys and values
	 * @function createFromPassportProfile
	 * @param {Object} profile - The passport profile to base the new user on
	 * @param {Object} customKeysAndVals The custom keys and values to add to the user
	 * @returns {Object} - The user object
	 */
	userSchema.statics.createFromPassportProfile = function(profile, customKeysAndVals = {}){
		return new this(Object.assign(this.getPassportUserMappings(profile), customKeysAndVals, {email : {verified: profile.emails[0].value}}));
	}
	
	//User methods
	
	
	/**
	 * Updates a new user based on the passed passport profile and the passed custom keys and values
	 * @function updateFromPassportProfile
	 * @param {Object} profile - The passport profile to update the user from
	 * @param {Object} customKeysAndVals The custom keys and values to update
	 * @returns {undefined}
	 */
	userSchema.methods.updateFromPassportProfile = function(profile, customKeysAndVals){
		if(!customKeysAndVals){customKeysAndVals = {};}
		
		var obj = Object.assign(this.constructor.getPassportUserMappings(profile), customKeysAndVals);
		for(var key in obj){
			if(obj.hasOwnProperty(key)){
				this[key] = obj[key];
			}
		}
		
		return this;
	}
	
	/**
	 * Verifies the password for a specific user
	 * @function verifyPassword
	 * @param {string} password - The password to verify
	 * @param {Function} callback - The function called after verifying the password
	 * @returns {Boolean} - Whether the password could be verified or not
	 */
	userSchema.methods.verifyPassword = function(password, callback){
		
		let {hash, salt}							= this.constructor.hash(password, this.password.salt,  this.password.algorithm);
		let {hash : newHash, newAlgorithm}			= this.constructor.hash(password, this.password.salt);
		
		if(hash == this.password.hash){
			//password is correct, check if the hash algorithm changed
			
			if(this.password.algorithm !== newAlgorithm){
				//yes it did, hash and store the password with the new algorithm one
				this.password.hash			= newHash;
				this.password.algorithm		= newAlgorithm;
			}
			
			return this.save((err, user) => {
				
				if(err){
					return callback(new this.constructor.errorController.errors.DatabaseError({
						message: err.message
					}), false);
				}
				
				return callback(null, true);
				
			});
		}
		
		return callback(null, false);
	};
	
	/**
	 * Updates the password for a specific user
	 * @function updatePassword
	 * @param {string} password - The new password
	 * @param {string} passwordResetCode - The received reset code that verifies this operation
	 * @param {Function} callback - The function called after updating the password
	 * @returns {Boolean} - Whether the update succeeded
	 */
	userSchema.methods.updatePassword = function(password, passwordResetCode = null, callback){
		
		if((this.password.resetCode && this.password.resetCode === passwordResetCode)){
			
			if(this.password.resetCodeExpirationDate >= new Date()){	
				this.password.resetCode			= "";
				this.password.resetTimestamp	= 0;
			
				Object.assign(this.password, this.constructor.hash(password));
				
				return this.save((err, user) => {
					
					if(err){
						return callback(new this.constructor.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					return callback(null, true);
					
				});
			}else{
				return callback(new this.constructor.errorController.errors.PasswordResetCodeExpiredError(), false);
			}
		}else{
			return callback(new this.constructor.errorController.errors.PasswordResetCodeInvalidError(), false);
		}
	};
	
	/**
	 * Sends a mail to the current user with the correct name
	 * @function sendMail
	 * @param {String} toEmail - the email of the recipient
	 * @param {String} subject - The subject of the email
	 * @param {String} html - The content of the email
	 * @param {String} text - The text version of the email
	 * @param {Function} callback - A callback function that will be called after sending the mail or encountering an error
	 * @param {Array} cc - An array of recipients who will appear in the cc field
	 * @param {Array} bcc - An array of recipients who won't be displayed
	 * @param {String} replyTo - A mail address to who the recipients should reply
	 * @returns {undefined} - The data is returned with the callback parameter
	 */
	userSchema.methods.sendMail = function(subject, html, text, callback, toEmail = this.email.verified, cc = [], bcc = [], replyTo = null){
		this.constructor.mailController.sendMail(['"' + this.name.first + '" <' + toEmail + '>'], subject, html, text, callback, cc, bcc, replyTo);
	}
	
	/**
	 * Inits a password reset for the current user by generating a reset code and sending it by mail
	 * @function initPasswordReset
	 * @param {Function} callback - The function that will be called if the render succeeds or an error occurs
	 * @returns {undefined} The data is returned with the callback parameter
	 */
	userSchema.methods.initPasswordReset = function(callback){
		var passwordResetCode	= this.constructor.generateRandomString(this.constructor.config.TOKEN_LENGTH);
		var resetMail			= new this.constructor.EmailTemplate(__dirname + "/../templates/emails/password-reset");
		
		let expirationDate = new Date();
		expirationDate.setSeconds(expirationDate.getSeconds() + this.constructor.config.RESET_CODE_LIFETIME);
		
		this.password.resetCode					= passwordResetCode;
		this.password.resetCodeExpirationDate	= expirationDate;
		
		resetMail.render({
			user					: this
		}, this.locale, (err, result) => {
			if(err){
				return callback(new this.constructor.errorController.errors.RenderError({
					message: err.message
				}), false);
			}
			
			this.sendMail(result.subject, result.html, result.text, (error, success) => {
				
				if(error){
					return callback(error, false);
				}
				
				if(success){
					
					this.save((err, user) => {
						if(err){
							return callback(new this.constructor.errorController.errors.DatabaseError({
								message: err.message
							}), false);
						}
						
						return callback(null, true);
						
					});
				}
			});
		});
	};
	
	/**
	 * Inits a email confirmation for the current user by generating a code and sending it by mail
	 * @function initEmailVerification
	 * @param {Function} callback - The function that will be called if the
	 * mail was sent successfully or an error occurs
	 * @returns {undefined} The data is returned with the callback parameter
	 */
	userSchema.methods.initEmailVerification = function(callback, registration = false){
		
		var emailVerificationCode	= this.constructor.generateRandomString(this.constructor.config.CONFIRM_TOKEN_LENGTH);
		var confirmationMail		= new this.constructor.EmailTemplate(__dirname + "/../templates/emails/email-confirmation");
		
		this.email.verificationCode = emailVerificationCode;
		
		confirmationMail.render(
		{
			user					: this
			
		},
		
		this.locale, (err, result) => {
		
			if(err){
				return callback(new this.constructor.errorController.errors.RenderError({
					message: err.message
				}), false);
			}
			
			this.sendMail(result.subject, result.html, result.text, (error, success) => {
				
				if(error){
					return callback(error, success);
				}
				
				if(success){
					
					this.email.verificationCode	= emailVerificationCode;
					
					if(registration){
						this.password.resetCode	= emailVerificationCode;
					}
					
					return this.save((err) => {
						if(err){
							return callback(new this.constructor.errorController.errors.DatabaseError({
								message: err.message
							}), false);
						}
						
						return callback(null, success);
						
					});
				}
				
				return callback(error, success);
			}, this.email.unverified);
			
		});
	};
	
	/**
	 * Verifies the users email
	 * @function verifyEmail
	 * @param {string} email - The email to verify
	 * @param {string} emailVerificationCode - The received verification code that verifies this operation
	 * @param {Function} callback - The function called after verifying the email
	 * @returns {Boolean} - Whether the update succeeded
	 */
	userSchema.methods.verifyEmail = function(email, emailVerificationCode = null, callback){
		
		if(email && emailVerificationCode && this.email.verificationCode === emailVerificationCode && this.email.unverified === email){
			
			this.email.verified			= email;
			this.email.verificationCode	= "";
			this.email.unverified		= "";
			
			return this.save((err, user) => {
				
				if(err){
					return callback(new this.constructor.errorController.errors.DatabaseError({
						message: err.message
					}), false);
				}
				
				return callback(null, true);
				
			});
			
		}
		
		return callback(new this.constructor.errorController.errors.EmailVerificationCodeInvalidError(), false);
	}
	
	/**
	 * Checks whether the current user has said permissions
	 * @function hasPermissions
	 * @param {Array} permissions - The array of permissions to check
	 * @returns {boolean} Whether the user has all of the given permissions
	 */
	userSchema.methods.hasPermissions = function(permissions){
		
		let missing = permissions.filter((permission) => {
			
			for(let i=0;i<this.permissions.length;i++){
				if(
					permission === this.permissions[i] || /* has exactly this permission */
					permission.startsWith(this.permissions[i] + ".") /* has a higher level permission */
				){
					return false; //not missing, remove from array
				}
			}
			
			return true; //missing, leave in array
			
		});
		
		return missing.length === 0;
	};
	
	/**
	 * Checks whether the current user has said permission
	 * @function hasPermission
	 * @param {String} permission - The permission to check
	 * @returns {boolean} Whether the user has the given permission
	 */
	userSchema.methods.hasPermission = function(permission){
		return this.hasPermissions([permission]);
	};
	
	//Delete cascade
	userSchema.pre('remove', function(next){
		
		//'this' is the user being removed
		mongoose.model("OAuthClient").find({userId: this._id}, (err, clients) => {
			if(!err && clients){
				clients.forEach((client) => {
					client.remove(); //calls middleware
				});
			}
		});
		
		mongoose.model("OAuthAccessToken").find({userId: this._id}, (err, accessTokens) => {
			if(!err && accessTokens){
				accessTokens.forEach((accessToken) => {
					accessToken.remove(); //calls middleware
				});
			}
		});
		
		mongoose.model("OAuthCode").find({userId: this._id}, (err, codes) => {
			if(!err && codes){
				codes.forEach((code) => {
					code.remove(); //calls middleware
				});
			}
		});
				
		next();
	});
	
	
	userSchema.set("toJSON", {
	    transform: (doc, ret, options) => {
		    
		    if(options.rawData === true){
			    return ret;
		    }
		    
	        return {
	        	_id					: ret._id,
	        	name				: ret.name,
	        	
	        	permissions			: ret.permissions,
	        	
	        	profilePictureUrl	: ret.profilePictureUrl,
	        	
	        	/*email				: ret.email.verified,*/
	        	created				: ret.created
	        };
	    }
	});
	
	return mongoose.model("User", userSchema);
	
}

module.exports = User;