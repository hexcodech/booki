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
		
		if(request.hasPermission("admin.client.filters")){
				
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
				
				if(request.hasPermission("admin.client.rawData.read")){
				
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
				
				if(request.hasPermission("admin.client.rawData.read")){
				
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
		
		if(request.hasPermissions(["admin.client.create", "admin.client.rawData.write"])){
			
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
				
				if(request.hasPermission("admin.client.rawData.read")){
					let json = client.toJSON({rawData: true});
					
					json.secret.secret = secret; //add secret to response
					response.json(json);
				}else{
					let json = client.toJSON();
					
					json.secret.secret = secret; //add secret to response
					response.json(json);
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
				
				if(request.hasPermissions(["admin.client.editOthers", "admin.client.rawData.write"])){
					
					newClientData = request.body.client;
					
				}else if(client.userId === request.user._id || request.hasPermission("admin.client.editOthers")){
					
					newClientData = this.createObjectWithOptionalKeys(request.body.client, ["name", "redirectUris"]);
					
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
				
				this.OAuthClient.findByIdAndUpdate(request.params.clientId, newClientData, {new: true}, (err, updatedClient) => {
			
					if(err){
						return next(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					}
					
					if(request.hasPermission("admin.client.rawData.read")){
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
				
				if(client.userId === request.user._id || request.hasPermission("admin.client.deleteOthers")){
					
					client.remove((err) => { //calls middleware
						
						if(err){
							return next(new this.errorController.errors.DatabaseError({
								message: err.message
							}), null);
						}
						
						response.json({success: true});
						response.end();
					});
						
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