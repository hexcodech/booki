class OAuthClient {
	
	constructor({booki, config, mongoose}){
	
		//store the passed parameters
		this.mongoose				= mongoose;
		this.config					= config;
		
		this.generateRandomString	= booki.generateRandomString;
		this.hash					= booki.hash;
		
		
		var OAuthClientSchema = new this.mongoose.Schema({
			id							: {type: String, unique: true, required: true},
			name						: {type: String, unique: true, required: true},
			secret						: {
				
				hash						: {type: String, "default": "", required: true},
				salt						: {type: String, "default": "", required: true},
				algorithm					: {type: String, "default": "", required: true}
				
			},
			trusted						: {type: Boolean, "default": false, required: true},
			redirectUris				: {type: Array, required: true},
			userId						: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}
		});
		
		OAuthClientSchema.statics.secretLength	= this.config.CLIENT_SECRET_LENGTH;
		
		OAuthClientSchema.statics.generateSecret = function(){
			return this.generateRandomString(this.secretLength);
		}
		
		OAuthClientSchema.methods.setSecret = function(secret){
			let {hash, salt, algorithm} = this.constructor.hash(secret);
			
			this.secret.hash			= hash;
			this.secret.salt			= salt;
			this.secret.algorithm		= algorithm;
			
			return true;
		}
		
		OAuthClientSchema.methods.verifySecret = function(secret){
			let {hash}									= this.constructor.hash(secret, this.secret.salt, this.secret.algorithm);
			let {hash : newHash, newAlgorithm}			= this.constructor.hash(secret, this.secret.salt);
			
			if(this.secret.hash && hash === this.secret.hash){
				
				if(this.secret.algorithm !== algorithm){
					//if the algorithm changed, update the hash
					this.secret.hash		= newHash;
					this.secret.algorithm	= newAlgorithm;
				}
				
				return true;
				
			}
			
			return false;
		}
		
		OAuthClientSchema.methods.verifyRedirectUri = function(redirectUri){
			for(var i=0;i<this.redirectUris;i++){
				if(redirectUris[i] === redirectUri){
					return true;
				}
			}
			
			return false;
		}
		
		OAuthClientSchema.set("toJSON", {
		    transform: function(doc, ret, options) {
		        return {
		        	id					: ret.id,
		        	name				: ret.name,
		        	redirectUri			: ret.redirectUri,
		        	userId				: ret.userId
		        };
		    }
		});
					
		
		return this.mongoose.model("OAuthClient", OAuthClientSchema);
		
	}
	
}

module.exports = OAuthClient;