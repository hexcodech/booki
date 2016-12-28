class OAuthClientController{
	
	constructor({booki, config, mongoose, errorController}){
		
		this.config						= config;
		this.mongoose					= mongoose;
		this.errorController			= errorController;
		
		this.getLocale					= booki.getLocale;
		this.generateRandomString		= booki.generateRandomString;
		
		this.OAuthClient				= this.mongoose.model("OAuthClient");
		
		booki.bindAll(this, ["postOAuthClients", "getOAuthClients"]);
		
	}
	
	postOAuthClients(request, response, next){
		
		let secret = this.OAuthClient.generateSecret();
		
		let client = new this.OAuthClient({
			id							: this.generateRandomString(this.config.CLIENT_ID_LENGTH),
			name						: request.body.name,
			redirectUris				: request.body.redirectUris,
			userId						: request.user._id
		});
		
		client.setSecret(secret);
		
		client.save((err, client) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(client){
				
				response.json(Object.assign(client.toJSON(), {secret: secret}));//add secret to response
				return response.end();
				
			}
			
			return next(new this.errorController.errors.UnexpectedQueryResultError());
			
		});
		
	}
	
	getOAuthClients(request, response, next){
		this.OAuthClient.find({userId: request.user._id}, (err, clients) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(clients){
				
				response.json(clients.toJSON);
				return response.end();
				
			}
			
			return next(new this.errorController.errors.UnexpectedQueryResultError());
			
		});
	}
	
}

module.exports = OAuthClientController;