class OAuthClientController{
	
	constructor({booki, config, mongoose, errorController, bindAll, getLocale, generateRandomString, createObjectWithOptionalKeys}){
		
		this.config							= config;
		this.mongoose						= mongoose;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		this.generateRandomString			= generateRandomString;
		this.createObjectWithOptionalKeys	= createObjectWithOptionalKeys;
		
		this.OAuthClient					= this.mongoose.model("OAuthClient");
		
		bindAll(this, ["getOAuthClient", "postOAuthClient", "getOAuthClientById", "putOAuthClient", "deleteOAuthClient"]);
		
	}
	
	getOAuthClient(request, response, next){
		
		let filter;
		
		if(request.user.hasPermission("admin.client.filters")){
				
			filter = request.body.filter;
			
		}else{
			
			filter = {
				userId: request.user._id
			};
			
		}
		
		this.OAuthClient.find(filter, (err, clients) => {
		
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(clients){
				
				if(request.user.hasPermission("admin.client.rawData.read")){
				
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
				
				if(request.user.hasPermission("admin.client.rawData.read")){
				
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
		
		const secret = this.OAuthClient.generateSecret();
		
		let clientData;
		
		if(request.user.hasPermissions(["admin.client.create", "admin.client.rawData.write"])){
			
			clientData = request.body.client;
			
			if(!clientData.userId){
				clientData.userId = request.user._id;
			}
			
		}else{
			clientData = {
				name						: request.body.client.name,
				redirectUris				: request.body.client.redirectUris,
				userId						: request.user._id
			};
		}
		
		let client = new this.OAuthClient(clientData);
		
		client.setSecret(secret);
		
		client.save((err, client) => {
			
			if(err){console.log(err);
				
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(client){
				
				if(request.user.hasPermission("admin.client.rawData.read")){
					response.json(Object.assign(client.toJSON({rawData: true}), {secret}));//add secret to response
				}else{
					response.json(Object.assign(client.toJSON(), {secret}));//add secret to response
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
				
				let newClientData;
				
				if(request.user.hasPermissions(["admin.client.editOthers", "admin.client.rawData.write"])){
					
					newClientData = request.body.client;
					
				}else if(client.userId === request.user._id || request.user.hasPermission("admin.client.editOthers")){
					
					newClientData = this.createObjectWithOptionalKeys(request.body.client, ["name", "redirectUris"]);
					
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
				
				this.OAuthClient.findByIdAndUpdate(request.params.clientId, newClientData, {new: true}, (err2, updatedClient) => {
			
					if(err2){
						return next(new this.errorController.errors.DatabaseError({
							message: err2.message
						}), null);
					}
					
					if(request.user.hasPermission("admin.client.rawData.read")){
						response.json(updatedClient.toJSON({rawData: true}));
					}else{
						response.json(updatedClient.toJSON());
					}
					
					return response.end();
					
				});
				
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
			
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
				
				if(client.userId === request.user._id || request.user.hasPermission("admin.client.deleteOthers")){
					
					this.OAuthClient.findByIdAndRemove(request.params.clientId, (err) => {
						
						if(err){
							return next(new this.errorController.errors.DatabaseError({
								message: err.message
							}), null);
						}
						
						response.json({success: true});
						response.end();
					});
					
					return;
						
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
				
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
		});
		
	}
}

module.exports = OAuthClientController;