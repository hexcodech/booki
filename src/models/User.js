/**
 * Defines the user structure
 */
 
class User{
	
	constructor({booki, config, i18n, errorController, mongoose}){
	
		//store the passed parameters
		this.i18n					= i18n;
		this.errorController		= errorController;
		this.mongoose				= mongoose;
		this.config					= config;
		
		//include required modules
		this.crypto					= require("crypto");
		
		let MailController			= require("../controllers/MailController");
		this.mailController			= new MailController(booki);
		
		this.EmailTemplate			= require("email-templates").EmailTemplate;
		
		
		//setup some values
		var userSchema = new this.mongoose.Schema({
			displayName					: {type: String, required: true},
			firstName					: {type: String, required: true},
			lastName					: {type: String, required: true},
			
			email						: {type: String, unique: true, required: true},
			passwordHash				: {type: String, "default": "", required: false},
			passwordHashAlgorithm		: {type: String, "default": "", required: false},
			passwordSalt				: {type: String, "default": "", required: false},
			
			preferedLocale				: {type: String, required: true},
			
			passwordResetCode			: {type: String, "default": "", required: false},
			mailConfirmationCode		: {type: String, "default": "", required: false},
			
			dateCreated					: {type: Date, "default": Date.now, required: true},
			
			profilePictureURL			: {
				type: String,
				"default": "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mm&s=512",
				required: true
				//https://de.gravatar.com/site/implement/images/
			},
			
			
			facebookAccessToken			: {type: String, "default": "", required: false},
			facebookRefreshToken		: {type: String, "default": "", required: false},
			
			twitterToken				: {type: String, "default": "", required: false},
			twitterTokenSecret			: {type: String, "default": "", required: false},
			
			googleAccessToken			: {type: String, "default": "", required: false},
			googleRefreshToken			: {type: String, "default": "", required: false},
		});
		
		//Define constants and pass some modules
		
		userSchema.statics.crypto			= this.crypto;
		userSchema.statics.errorController	= this.errorController;
		userSchema.statics.mailController	= this.mailController;
		userSchema.statics.EmailTemplate	= this.EmailTemplate;
		
		userSchema.statics.hashAlgorithm	= this.config.HASH_ALGORITHM;
		userSchema.statics.saltLength		= this.config.SALT_LENGTH;
		userSchema.statics.tokenLength		= this.config.TOKEN_LENGTH;
		
		/**
		 * Finds a matching user to the passed passport profile
		 * @function getUserByPassportProfile
		 * @param {Object} profile - The passport profile to base the new user on
		 * @param {Function} callback - The function to execute when this function found a user
		 * @returns {undefined} The data is returned with the callback parameter
		 */
		userSchema.statics.getUserByPassportProfile = function(profile, callback){
			var user	= null;
			
			for(var i=0;i<profile.emails.length;i++){
				this.findOne({email: profile.emails[i]}, function(err, _user){
					
					if(err){
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					}
					
					if(_user){
						//User exists
						user	= _user;
						
						i		= profile.emails.length;//breaks the loop
					}
					
				});
			}
			
			return callback(null, user);
		}
		
		/**
		 * Registers a new user
		 * @function register
		 * @param {Object} profile - The passport profile to base the new user on
		 * @param {Function} callback - The function to execute when this function found a user
		 * @returns {undefined} The data is returned with the callback parameter
		 */
		userSchema.statics.register = function(firstName, lastName, email, preferedLocale, callback){
			var userData = {
				displayName					: firstName + " " + lastName,
				firstName					: firstName,
				lastName					: lastName,
				
				email						: email,
				
				preferedLocale				: preferedLocale,
				
				passwordResetCode			: "",
				mailConfirmationCode		: "",
			};
			
			var user = new this(userData);
			
			this.find({email: email}, function(err, users){
				if(err){
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				if(users){
					
					return callback(new this.errorController.errors.UserAlreadyExistsError(), null);
					
				}else{
					user.save(function(err2){
						
						if(err2){
							return callback(new this.errorController.errors.DatabaseError({
								message: err2.message
							}), null);
						}
						
						user.initEmailConfirmation(function(error, success){
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
		 * @returns {undefined} The data is returned with the callback parameter
		 */
		userSchema.statics.findOrCreateUserByPassportProfile = function(profile, customKeysAndVals, callback){
			
			this.getUserByPassportProfile(profile, (errorObj, user) => {
				
				if(err1){
					return callback(errorObj, null);
				}
				
				if(user){
					//update values for the current user
					user.updateFromPassportProfile(profile, customKeysAndVals);
				}else{
					//we have to create a new user
					user = this.createFromPassportProfile(profile, customKeysAndVals);
				}
				
				user.save(function(err){
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
		 * @returns {Object} The user keys and values that can be used to create a user
		 */
		userSchema.statics.getPassportUserMappings = function(profile){
			
			return {
				displayName				: profile.displayName,
				firstName				: profile.name.givenName,
				lastName				: profile.name.familyName,
				
				//email					: profile.emails[0].value, shouldn't be updated without the user wanting it
				
				profilePictureURL		: photos[0].value
			};
		}
		
		/**
		 * Creates a new user based on the passed passport profile and the passed custom keys and values
		 * @function createFromPassportProfile
		 * @param {Object} profile - The passport profile to base the new user on
		 * @param {Object} customKeysAndVals The custom keys and values to add to the user
		 * @returns {Object} The user object
		 */
		userSchema.statics.createFromPassportProfile = function(profile, customKeysAndVals){
			if(!customKeysAndVals){customKeysAndVals = {};}
			
			return new this(Object.assign(this.getPassportUserMappings(profile), Object.assign(
				customKeysAndVals,
				{email : profile.emails[0].value}
			)));
		}
		
		/**
		 * Generates random string of characters
		 * @function generateRandomString
		 * @param {number} length - Length of the random string.
		 * @returns {String} A random string of a given length
		 */
		userSchema.statics.generateRandomString = function(length){
			return this.crypto.randomBytes(Math.ceil(length/2))
	        	.toString("hex") //convert to hexadecimal format
	        	.slice(0, length);
		}
		
		/**
		 * Hash password using this.HASH_ALGORITHM or the passed algorithm
		 * @function hash
		 * @param {string} password - The password to be hashed
		 * @param {string} salt - The salt to be used while hashing
		 * @param {string} [algorithm=this.HASH_ALGORITHM] - The hash algorithm that should be used
		 * @returns {string} The hashed password
		 */
		userSchema.statics.hash = function(password, salt, algorithm){
			if(!algorithm){
				algorithm = this.hashAlgorithm;
			}
			
		    var hash = this.crypto.createHmac(algorithm, salt);
		    hash.update(password);
		    
		    return hash.digest("hex");
		};
		
		
		
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
			for(key in obj){
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
		 * @returns {Boolean} Whether the password could be verified or not
		 */
		userSchema.methods.verifyPassword = function(password){
			
			if(this.constructor.hash(password, this.passwordSalt, this.passwordHashAlgorithm) == this.passwordHash){
				//password is correct, check if the hash algorithm changed
				
				var hashAlgorithm = this.constructor.hashAlgorithm;
				
				if(this.passwordHashAlgorithm !== hashAlgorithm){
					//yes it did, hash and store the password with the new algorithm one
					this.passwordHash		= "";
					this.passwordResetCode	= "";
					
					this.updatePassword(password);
				}
				
				return true;
			}
			
			return false;
		};
		
		/**
		 * Updates the password for a specific user
		 * @function updatePassword
		 * @param {string} password - The new password
		 * @param {string} passwordResetCode - The received reset code that verifies this operation
		 * @returns {Boolean} If the update succeeds
		 */
		userSchema.methods.updatePassword = function(password, passwordResetCode){
			if(
					( !passwordResetCode && !this.passwordHash &&	!this.passwordResetCode ) ||
					( this.passwordResetCode  && this.passwordResetCode === passwordResetCode ) )
			{
				
				var salt					= this.constructor.generateRandomString(this.constructor.saltLength);
				
				this.passwordResetCode		= "";
				
				this.passwordHash			= this.constructor.hash(password, salt);
				this.passwordHashAlgorithm	= this.constructor.hashAlgorithm;
				this.passwordSalt			= salt;
				
				return true;
			}
			
			return false;
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
		 * @returns {undefined} The data is returned with the callback parameter
		 */
		userSchema.methods.sendMail = function(cc, bcc, subject, html, replyTo, callback){
			this.constructor.mailController.sendMail(['"' + this.firstName + " " + this.lastName + '" <' + this.email + '>'], cc, bcc, subject, html, replyTo, callback);
		}
		
		/**
		 * Inits a password reset for the current user by generating a reset code and sending it by mail
		 * @function initPasswordReset
		 * @param {Function} callback - The function that will be called if the render succeeds or an error occurs
		 * @returns {undefined} The data is returned with the callback parameter
		 */
		userSchema.methods.initPasswordReset = function(callback){
			var passwordResetCode	= this.constructor.generateRandomString(this.constructor.tokenLength);
			var resetMail			= new this.constructor.EmailTemplate(__dirname + "/../templates/emails/password-reset");
			
			resetMail.render(this, this.preferedLocale, (err, result) => {
				if(err){
					return callback(new this.constructor.errorController.errors.RenderError({
						message: err.message
					}), false);
				}
				this.sendMail([], [], result.subject, result.html, null, function(error, success){
					if(success){
						this.passwordResetCode = passwordResetCode;
					}
					return callback(error, success);
				});
			});
		};
		
		/**
		 * Inits a email confirmation for the current user by generating a code and sending it by mail
		 * @function initEmailConfirmation
		 * @param {Function} callback - The function that will be called if the
		 * mail was sent successfully or an error occurs
		 * @returns {undefined} The data is returned with the callback parameter
		 */
		userSchema.methods.initEmailConfirmation = function(callback, registration){
			
			var mailConfirmationCode	= this.constructor.generateRandomString(this.constructor.tokenLength);
			var confirmationMail		= new this.constructor.EmailTemplate(__dirname + "/../templates/emails/email-confirmation");
			
			confirmationMail.render(
			{
				displayName				: this.displayName,
				mailConfirmationCode	: mailConfirmationCode
				
			},
			
			this.preferedLocale, (err, result) => {
				
				if(err){
					return callback(new this.constructor.errorController.errors.RenderError({
						message: err.message
					}), false);
				}
				
				this.sendMail([], [], result.subject, result.html, null, function(error, success){
					
					if(success){
						this.mailConfirmationCode	= mailConfirmationCode;
						
						if(registration){
							this.passwordResetCode	= mailConfirmationCode;
						}
					}
					
					return callback(error, success);
				});
			});
		};
		
		
		userSchema.set("toJSON", {
		    transform: function(doc, ret, options) {
		        return {
		        	id				: ret._id,
		        	displayName		: ret.displayName,
		        	firstName		: ret.firstName,
		        	lastName		: ret.lastName,
		        	
		        	email			: ret.email,
		        	dateCreated		: ret.dateCreated
		        };
		    }
		});
		
		return this.mongoose.model("User", userSchema);
		
	}
	
}

module.exports = User;