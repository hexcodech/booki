class OAuthClient {
	
	constructor({booki, config, mongoose}){
		
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
		
		OAuthClientSchema.statics.generateSecret = function(){ //this reference this files class in this instance
			return booki.generateRandomString(config.CLIENT_SECRET_LENGTH);
		}
		
		OAuthClientSchema.statics.hash = booki.hash;
		
		OAuthClientSchema.methods.setSecret = function(secret){
			let {hash, salt, algorithm} = this.constructor.hash(secret);
			
			this.secret.hash			= hash;
			this.secret.salt			= salt;
			this.secret.algorithm		= algorithm;
			
			return true;
		}
		
		OAuthClientSchema.methods.verifySecret = function(secret, callback){
			let {hash}									= this.constructor.hash(secret, this.secret.salt, this.secret.algorithm);
			let {hash : newHash, newAlgorithm}			= this.constructor.hash(secret, this.secret.salt);
			
			if(this.secret.hash && hash === this.secret.hash){
				
				if(this.secret.algorithm !== algorithm){
					//if the algorithm changed, update the hash
					this.secret.hash		= newHash;
					this.secret.algorithm	= newAlgorithm;
				}
				
				return this.save((err, client) => {
					
					if(err){
						return callback(new this.constructor.errorController.errors.DatabaseError({
							message: err.message
						}), false);
					}
					
					return callback(null, true);
					
				});
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
	
}

module.exports = OAuthClient;