function OAuthClient({booki, config, mongoose, errorController, generateRandomString, hash}){
	
	var OAuthClientSchema = new mongoose.Schema({
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
	
	OAuthClientSchema.statics.errorController		= errorController;
	OAuthClientSchema.statics.generateRandomString	= generateRandomString;
	OAuthClientSchema.statics.hash					= hash;
	
	OAuthClientSchema.statics.generateSecret = function(){
		return this.generateRandomString(config.CLIENT_SECRET_LENGTH);
	}
	
	OAuthClientSchema.methods.setSecret = function(secret){
		let {hash, salt, algorithm} = this.constructor.hash(secret);
		
		this.secret.hash			= hash;
		this.secret.salt			= salt;
		this.secret.algorithm		= algorithm;
	}
	
	OAuthClientSchema.methods.verifySecret = function(secret, callback){
		let {hash}										= this.constructor.hash(secret, this.secret.salt, this.secret.algorithm);
		let {hash : newHash, algorithm: newAlgorithm}	= this.constructor.hash(secret, this.secret.salt);
		
		if(this.secret.hash && hash === this.secret.hash){
			
			if(this.secret.algorithm !== newAlgorithm){
				
				//if the algorithm changed, update the hash
				this.secret.hash		= newHash;
				this.secret.algorithm	= newAlgorithm;
				
				return this.save((err, client) => {
				
					if(err){
						
						return callback(new this.constructor.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					return callback(null, true);
					
				});
			}
			
			return callback(null, true);
			
		}
		
		return callback(null, false);
	}
	
	OAuthClientSchema.methods.verifyRedirectUri = function(redirectUri){
		for(var i=0;i<this.redirectUris.length;i++){
			if(this.redirectUris[i] === redirectUri){
				return true;
			}
		}
		
		return false;
	}
	
	OAuthClientSchema.set("toJSON", {
	    transform: function(doc, ret, options) {
	        return {
	        	id					: ret._id,
	        	name				: ret.name,
	        	redirectUri			: ret.redirectUri,
	        	userId				: ret.userId
	        };
	    }
	});
				
	
	return mongoose.model("OAuthClient", OAuthClientSchema);
	
}

module.exports = OAuthClient;