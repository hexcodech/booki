class OAuthClientController{
	
	constructor({booki, config, mongoose, errorController, bindAll, getLocale, generateRandomString, createObjectWithOptionalKeys}){
		
		this.config							= config;
		this.mongoose						= mongoose;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		this.generateRandomString			= generateRandomString;
		this.createObjectWithOptionalKeys	= createObjectWithOptionalKeys;
		
		this.OAuthClient					= this.mongoose.model("OAuthClient");
		
		bindAll(this, ["getOAuthClient", "postOAuthClient", "getOAuthClientById", "postOAuthClient", "putOAuthClient", "deleteOAuthClient"]);
		
	}
	
	getOAuthClient(request, response, next){
		this.OAuthClient.find({userId: request.user._id}, (err, clients) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(clients){
				
				if(request.user.hasCapability("access-raw-data")){
				
					response.json(clients.map((client) => {
						return client.toJSON({rawData: true});
					}));
					
				}else{
					
					response.json(clients.map((client) => {
						return client.toJSON();
					}));
					
				}
				
				return response.end();
				
			}
			
			return next(new this.errorController.errors.UnexpectedQueryResultError());
			
		});
	}
	
	getOAuthClientById(request, response, next){
		this.OAuthClient.findOne({_id: request.params.clientId, userId: request.user._id}, (err, client) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(client){
				
				if(request.user.hasCapability("access-raw-data")){
				
					response.json(client.toJSON({rawData: true}));
					
				}else{
					
					response.json(client.toJSON());
					
				}
				
				return response.end();
				
			}
			return next(new this.errorController.errors.UnexpectedQueryResultError());
		});
	}
	
	
	postOAuthClient(request, response, next){
		
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
				
				if(request.user.hasCapability("access-raw-data")){
					response.json(Object.assign(client.toJSON({rawData: true}), {secret: secret}));//add secret to response
				}else{
					response.json(Object.assign(client.toJSON(), {secret: secret}));//add secret to response
				}
				
				return response.end();	
			}
			return next(new this.errorController.errors.UnexpectedQueryResultError());
		});
		
	}
	
	putOAuthClient(request, response, next){
		
		this.OAuthClient.findById(request.params.clientId, (err, client) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(client){
				
				if(request.user.hasCapabilities(["edit-other-oauthclients", "access-raw-data"])){
					
					this.OAuthClient.findByIdAndUpdate(request.params.clientId, request.body.client, {new: true}, (err2, updatedClient) => {
			
						if(err2){
							return next(new this.errorController.errors.DatabaseError({
								message: err2.message
							}), null);
						}
						
						response.json(updatedClient.toJSON({rawData: true}));
						response.end();
						
					});
					
				}else if(client.userId === request.user._id){
					
					let newClientData = this.createObjectWithOptionalKeys(request.body.client, ["name", "redirectUris"]);
					
					this.OAuthClient.findByIdAndUpdate(request.params.clientId, newClientData, {new: true}, (err2, updatedClient) => {
			
						if(err2){
							return next(new this.errorController.errors.DatabaseError({
								message: err2.message
							}), null);
						}
						
						if(request.user.hasCapability("access-raw-data")){
							response.json(updatedClient.toJSON({rawData: true}));
						}else{
							response.json(updatedClient.toJSON());
						}
						
						response.end();
						
					});
					
				}else{
					next(new this.errorController.errors.ForbiddenError());
				}
				
			}
			return next(new this.errorController.errors.NotFoundError());
		});
		
	}
	
	deleteOAuthClient(request, response, next){
		
		this.OAuthClient.findById(request.params.clientId, (err, client) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(client){
				
				if(client.userId === request.user._id || request.user.hasCapability("delete-other-clients")){
					
					this.OAuthClient.findByIdAndRemove(request.params.clientId, (err) => {
						
						if(err){
							return next(new this.errorController.errors.DatabaseError({
								message: err.message
							}), null);
						}
						
						reponse.json({success: true});
						response.end();
					});
						
				}else{
					next(new this.errorController.errors.ForbiddenError());
				}
				
			}
			return next(new this.errorController.errors.NotFoundError());
		});
		
	}
}

module.exports = OAuthClientController;