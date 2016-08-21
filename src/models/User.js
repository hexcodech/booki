/**
 * Defines the user structure
 * @constructor
 */
var User = function(i18n, errors, mongoose){
	this.i18n		= i18n;
	this.errors		= errors;
	this.mongoose	= mongoose;
	
	var userSchema = new this.mongoose.Schema({
		firstName					: String,
		lastName					: String,
		email						: Email,
		passwordHash				: String,
		
		profilePictureURL			: URL,
		
		facebookAccessToken			: {type: String, "default": ""},
		facebookRefreshToken		: {type: String, "default": ""},
	});
}

module.exports = User;