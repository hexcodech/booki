/**
 * Defines the user structure
 * @constructor
 */
var User = function(i18n, errors, mongoose){
	//store passed params
	this.i18n					= i18n;
	this.errors					= errors;
	this.mongoose				= mongoose;
	
	var self					= this;
	
	//include required modules
	this.crypto					= require("crypto");
	
	//setup some values
	this.types					= this.mongoose.Schema.Types;
	
	var userSchema = new this.mongoose.Schema({
		displayName					: {type: String, required: true},
		firstName					: {type: String, required: true},
		lastName					: {type: String, required: true},
		
		email						: {type: this.types.Email, unique: true, required: true},
		passwordHash				: {type: String, "default": "", required: false},
		passwordHashAlgorithm		: {type: String, "default": "", required: false},
		passwordSalt				: {type: String, "default": "", required: false},
		
		passwordResetCode			: {type: String, "default": "", required: false},
		
		dateCreated					: {type: Date, "default": Date.now, required: true},
		
		profilePictureURL			: {
			type: this.mongoose.Schema.Types.URL,
			"default": "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mm",
			required: true
			//https://de.gravatar.com/site/implement/images/
		},
		
		
		facebookAccessToken			: {type: String, "default": "", required: false},
		facebookRefreshToken		: {type: String, "default": "", required: false},
		
		twitterToken				: {type: String, "default": "", required: false},
		twitterTokenSecret			: {type: String, "default": "", required: false},
		
		googleToken					: {type: String, "default": "", required: false},
		googleTokenSecret			: {type: String, "default": "", required: false},
	});
	
	//Define constants
	
	/**
	 * Gets the following constant: hash algorithm
	 * @function getConstantHashAlgorithm
	 * @returns {String} constant: hash algorithm
	 */
	userSchema.methods.getConstantHashAlgorithm = function(){
		return "sha512";
	}
	
	/**
	 * Gets the following constant: salt length
	 * @function getConstantSaltLength
	 * @returns {String} constant: salt length
	 */
	userSchema.methods.getConstantSaltLength = function(){
		return 30;
	}
	
	
	/**
	 * Generates random string of characters
	 * @function generateRandomString
	 * @param {number} length - Length of the random string.
	 * @returns {String} A random string of a given length
	 */
	userSchema.methods.generateRandomString = function(){
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
	userSchema.methods.hash = function(password, salt, algorithm){
		if(!algorithm){
			algorithm = this.getConstantHashAlgorithm();
		}
		
	    var hash = crypto.createHmac(algorithm, salt);
	    hash.update(password);
	    
	    return hash.digest("hex");
	};
	
	/**
	 * Verifies the password for a specific user
	 * @function verifyPassword
	 * @param {string} password - The password to verify
	 * @returns {Boolean} Whether the password could be verified or not
	 */
	userSchema.methods.verifyPassword = function(password){
		
		if(this.hash(password, this.passwordSalt, this.passwordHashAlgorithm) == this.passwordHash){
			//password is correct, check if the hash algorithm changed
			
			var hashAlgorithm = this.getConstantHashAlgorithm();
			
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
			
			var salt					= this.generateRandomString(this.getConstantSaltLength());
			
			this.passwordResetCode		= "";
			
			this.passwordHash			= this.hash(password, salt);
			this.passwordHashAlgorithm	= this.getConstantHashAlgorithm();
			this.passwordSalt			= salt;
			
			return true;
		}
		
		return false;
	};
	
	
	userSchema.set('toJSON', {
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

module.exports = User;