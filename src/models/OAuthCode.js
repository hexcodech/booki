class OAuthCode {
	
	constructor({booki, generateRandomString, hash, config, mongoose}){
	
		//store the passed parameters
		this.config					= config;
		this.mongoose				= mongoose;
		
		
		var OAuthCodeSchema = new this.mongoose.Schema({
			hash						: {type: String, required: true},
			/*salt						: {type: String, required: true}, //not required as the probability of two hashes being the same is extremely low
			algorithm					: {type: String, required: true}, //not required because changing the algorithm only renders the current codes invalid */
			
			clientId					: {type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true},
			userId						: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
			expires						: {type: Date, required: true}
		});
		
		OAuthCodeSchema.statics.tokenLength				= this.config.TOKEN_LENGTH;
		
		OAuthCodeSchema.statics.generateRandomString	= generateRandomString;
		OAuthCodeSchema.statics.hash					= hash;
		
		OAuthCodeSchema.statics.generateCode = function(){
			return this.generateRandomString(this.tokenLength);
		}
		
		OAuthCodeSchema.statics.findByCode = function(code, callback){
			this.find({hash: this.hash(code).hash}, callback);
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
					
		
		return this.mongoose.model("OAuthCode", OAuthCodeSchema);
		
	}
	
}

module.exports = OAuthCode;