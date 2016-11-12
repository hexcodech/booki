class OAuthAccessToken {
	
	constructor({booki, generateRandomString, hash, config, mongoose}){
	
		//store the passed parameters
		this.config					= config;
		this.mongoose				= mongoose;
		
		
		var OAuthAccessTokenSchema = new this.mongoose.Schema({
			hash						: {type: String, required: true},
			/*salt						: {type: String, required: true}, //not required as the probability of two hashes being the same is extremely low
			algorithm					: {type: String, required: true}, //not required because changing the algorithm only renders the current codes invalid */
			
			clientId					: {type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true},
			userId						: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
			expires						: {type: Date, required: true}
		});
		
		OAuthAccessTokenSchema.statics.tokenLength				= this.config.TOKEN_LENGTH;
		OAuthAccessTokenSchema.statics.algorithm				= this.config.HASH_ALGORITHM;
		
		OAuthAccessTokenSchema.statics.generateRandomString		= generateRandomString;
		OAuthAccessTokenSchema.statics.hash						= hash;
		
		OAuthAccessTokenSchema.statics.generateToken = function(){
			return this.generateRandomString(this.tokenLength);
		}
		
		OAuthAccessTokenSchema.statics.hashToken = function(token){
			return this.hash(token, false, this.algorithm);
		}
		
		OAuthAccessTokenSchema.statics.findByToken = function(token, callback){
			this.find({hash: this.hashToken(token)}, callback);
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
					
		
		return this.mongoose.model("OAuthAccessToken", OAuthAccessTokenSchema);
		
	}
	
}

module.exports = OAuthAccessToken;