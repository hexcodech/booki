function OAuthAccessToken({booki, config, mongoose, generateRandomString, hash}){
	
	//store the passed parameters
	
	let OAuthAccessTokenSchema = new mongoose.Schema({
		hash						: {type: String, required: true},
		/*salt						: {type: String, required: true}, //not required as the probability of two hashes being the same is extremely low
		algorithm					: {type: String, required: true}, //not required because changing the algorithm renders the current codes invalid */
		
		clientId					: {type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true},
		userId						: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
		expires						: {type: Date, required: true}
	});
	
	OAuthAccessTokenSchema.statics.generateRandomString	= generateRandomString;
	OAuthAccessTokenSchema.statics.hash					= hash;
	
	OAuthAccessTokenSchema.statics.generateToken = function(){
		return this.generateRandomString(config.TOKEN_LENGTH);
	}
	
	OAuthAccessTokenSchema.statics.hashToken = function(token){
		return this.hash(token, false).hash;
	}
	
	OAuthAccessTokenSchema.statics.findByToken = function(token, callback){
		this.findOne({hash: this.hashToken(token)}, callback);
	}
	
	OAuthAccessTokenSchema.set("toJSON", {
	    transform: function(doc, ret, options) {
	        return {
	        	clientId			: ret.clientId,
	        	userId				: ret.userId,
	        	expires				: ret.expires
	        };
	    }
	});
				
	
	return mongoose.model("OAuthAccessToken", OAuthAccessTokenSchema);
	
}

module.exports = OAuthAccessToken;