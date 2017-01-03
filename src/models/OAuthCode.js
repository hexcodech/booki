function OAuthCode({booki, config, mongoose, generateRandomString, hash}){
	
	var OAuthCodeSchema = new mongoose.Schema({
		hash						: {type: String, required: true},
		/*salt						: {type: String, required: true}, //not required as the probability of two hashes being the same is extremely low
		algorithm					: {type: String, required: true}, //not required because changing the algorithm only renders the current codes invalid */
		
		clientId					: {type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true},
		userId						: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
		expires						: {type: Date, required: true}
	});
	
	OAuthCodeSchema.statics.generateRandomString	= generateRandomString;
	OAuthCodeSchema.statics.hash					= hash;
	
	OAuthCodeSchema.statics.generateCode = function(){
		return this.generateRandomString(config.TOKEN_LENGTH);
	}
	
	OAuthCodeSchema.statics.hashCode = function(code){
		return this.hash(code, false).hash;
	}
	
	OAuthCodeSchema.statics.findByCode = function(code, callback){
		this.findOne({hash: this.hashCode(code)}, callback);
	}
	
	OAuthCodeSchema.set("toJSON", {
	    transform: function(doc, ret, options) {
	        return {
	        	clientId			: ret.clientId,
	        	userId				: ret.userId,
	        	expires				: ret.expires
	        };
	    }
	});
				
	
	return mongoose.model("OAuthCode", OAuthCodeSchema);
	
}

module.exports = OAuthCode;