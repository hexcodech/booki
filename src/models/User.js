/**
 * Defines the user structure
 */
 
function User({booki, config, mongoose, errorController, generateRandomString, hash}){
	
	
	//setup some values
	var userSchema = new mongoose.Schema({
		name						: {
			display						: {type: String, required: true},
			first						: {type: String, required: true},
			last						: {type: String, required: false},
		},
		
		email						: {type: String, unique: true, required: true},
		emailVerificationCode		: {type: String, "default": "", required: false},
		
		password					: {
			hash						: {type: String, "default": "", required: false},
			salt						: {type: String, "default": "", required: false},
			algorithm					: {type: String, "default": "", required: false},
			
			resetCode					: {type: String, "default": "", required: false},
		},
		
		capabilities				: {type: Array, "default": [], required: true},
		
		locale						: {type: String, required: true},
		placeOfResidence			: {type: String, required: false},
		
		created						: {type: Date, "default": Date.now, required: true},
		
		profilePictureURL			: {
			type: String,
			"default": "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mm&s=512",
			required: true
			//https://de.gravatar.com/site/implement/images/
		},
		
		facebook					: {
			friends						: {type: Array, required: false},
			
			accessToken					: {type: String, "default": "", required: false},
			refreshToken				: {type: String, "default": "", required: false},
		},
		
		google						: {
			accessToken					: {type: String, "default": "", required: false},
			refreshToken				: {type: String, "default": "", required: false},
		},
	});
	
	userSchema.statics.errorController		= errorController;
	userSchema.statics.generateRandomString	= generateRandomString;
	userSchema.statics.hash					= hash;
	
	userSchema.statics.MailController		= require("../controllers/MailController");;
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
			
			this.findOne({email: emails[index].value}, (err, user) => {
				
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
		var userData = {
			name						: {
				display						: firstName,
				first						: firstName
			},
			
			capabilities				: [],
			
			email						: email,
			emailVerificationCode		: "",
			
			locale						: locale,
			
		};
		
		var user = new this(userData);
		
		this.find({email: email}, (err, users) => {
			if(err){
				return callback(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(users && users.length > 0){
				
				return callback(new this.constructor.errorController.errors.UserAlreadyExistsError(), null);
				
			}else{
				user.save((err2) => {
					
					if(err2){
						return callback(new this.constructor.errorController.errors.DatabaseError({
							message: err2.message
						}), null);
					}
					
					user.initEmailConfirmation((error, success) => {
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
			
			//email					: profile.emails[0].value, shouldn't be updated without the user wanting it
			
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
		return new this(Object.assign(this.getPassportUserMappings(profile), customKeysAndVals, {email : profile.emails[0].value}));
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
	 * @returns {Boolean} - Whether the update succeeds
	 */
	userSchema.methods.updatePassword = function(password, passwordResetCode = null, callback){
		
		if((this.password.resetCode && this.password.resetCode === passwordResetCode)){
			
			this.password.resetCode		= "";
			
			let {hash, salt, algorithm} = this.constructor.hash(password);
			
			this.password.hash			= hash;
			this.password.algorithm		= algorithm;
			this.password.salt			= salt;
			
			return this.save((err, user) => {
				
				if(err){
					return callback(new this.constructor.errorController.errors.DatabaseError({
						message: err.message
					}), false);
				}
				
				return callback(null, true);
				
			});
		}
		
		return callback(new this.constructor.errorController.errors.PasswordResetCodeInvalidError(), false);
	};
	
	/**
	 * Sends a mail to the current user with the correct name
	 * @function sendMail
	 * @param {Array} cc - An array of recipients who will appear in the cc field
	 * @param {Array} bcc - An array of recipients who won't be displayed
	 * @param {String} subject - The subject of the email
	 * @param {String} html - The content of the email
	 * @param {String} replyTo - A mail address to who the recipients should reply
	 * @param {Function} callback - A callback function that will be called after
	 * sending the mail or encountering an error
	 * @returns {undefined} - The data is returned with the callback parameter
	 */
	userSchema.methods.sendMail = function(cc, bcc, subject, html, replyTo, callback){
		mailController.sendMail(['"' + this.name.first + '" <' + this.email + '>'], cc, bcc, subject, html, replyTo, callback);
	}
	
	/**
	 * Inits a password reset for the current user by generating a reset code and sending it by mail
	 * @function initPasswordReset
	 * @param {Function} callback - The function that will be called if the render succeeds or an error occurs
	 * @returns {undefined} The data is returned with the callback parameter
	 */
	userSchema.methods.initPasswordReset = function(callback){
		var passwordResetCode	= this.constructor.generateRandomString(config.TOKEN_LENGTH);
		var resetMail			= new this.constructor.EmailTemplate(__dirname + "/../templates/emails/password-reset");
		
		resetMail.render(this, this.locale, (err, result) => {
			if(err){
				return callback(new this.constructor.errorController.errors.RenderError({
					message: err.message
				}), false);
			}
			this.sendMail([], [], result.subject, result.html, null, function(error, success){
				if(success){
					this.password.resetCode = passwordResetCode;
				}
				
				if(error){
					return callback(error, success);
				}
				
				this.save((err, user) => {
					if(err){
						return callback(new this.constructor.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					return callback(null, success);
					
				});
				
				return callback(error, success);
			});
		});
	};
	
	/**
	 * Inits a password reset for the current user by generating a reset code and sending it by mail
	 * @function initPasswordReset
	 * @param {Function} callback - The function that will be called if the render succeeds or an error occurs
	 * @returns {undefined} The data is returned with the callback parameter
	 */
	userSchema.methods.initPasswordReset = function(callback){
		var passwordResetCode	= this.constructor.generateRandomString(config.TOKEN_LENGTH);
		var resetMail			= new this.constructor.EmailTemplate(__dirname + "/../templates/emails/password-reset");
		
		resetMail.render(this, this.locale, (err, result) => {
			if(err){
				return callback(new this.constructor.errorController.errors.RenderError({
					message: err.message
				}), false);
			}
			this.sendMail([], [], result.subject, result.html, null, function(error, success){
				if(success){
					this.password.resetCode = passwordResetCode;
				}
				
				if(error){
					return callback(error, success);
				}
				
				this.save((err, user) => {
					if(err){
						return callback(new this.constructor.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					return callback(null, success);
					
				});
				
				return callback(error, success);
			});
		});
	};
	
	/**
	 * Checks whether the current user has said capabilities
	 * @function hasCapabilities
	 * @param {Array} capabilities - The array of capabilities to check
	 * @returns {boolean} Whether the user has all of the given capabilities
	 */
	userSchema.methods.hasCapabilities = function(capabilities){
		
		for(let i=0;i<capabilities.length;i++){
			if(this.capabilities.indexOf(capabilities[i]) === -1){
				return false;
			}
		}
		
		return true;
	};
	
	
	userSchema.set("toJSON", {
	    transform: (doc, ret, options) => {
	        return {
	        	id					: ret._id,
	        	name				: ret.name,
	        	
	        	capabilities		: ret.capabilities,
	        	
	        	profilePictureURL	: ret.profilePictureURL,
	        	
	        	email				: ret.email,
	        	created				: ret.created
	        };
	    }
	});
	
	return mongoose.model("User", userSchema);
	
}

module.exports = User;