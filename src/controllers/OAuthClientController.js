class OAuthClientController{

	constructor({
		booki, config, errorController, getLocale, generateRandomString,
		models
	}){

		const bindAll                = require('lodash/bindAll');
		const pick                   = require('lodash/pick');
		const omitBy                 = require('lodash/omitBy');
		const isNil                  = require('lodash/isNil');

		this.config                  = config;
		this.errorController         = errorController;

		this.getLocale               = getLocale;
		this.generateRandomString    = generateRandomString;

		this.OAuthClient             = models.OAuthClient;
		this.OAuthRedirectUri        = models.OAuthRedirectUri;
		this.User                    = models.User;

		bindAll(this, [
			'getOAuthClient', 'postOAuthClient', 'getOAuthClientById',
			'putOAuthClient', 'deleteOAuthClient'
		]);

	}

	getOAuthClient(request, response, next){

		let query = pick(request.body.client, [
			'id', 'name', 'trusted'
		]);

		let userId = request.user.id;

		if(
			request.body.client.userId &&
			request.hasPermission('admin.client.filters')
		){

			userId = request.body.client.userId;

		}

		this.OAuthClient.findAll({where: query, include: [
			{
				model : this.User,
				as    : 'User',
				where : {id: userId}
			}
		]}).then((clients) => {

			if(clients){

				if(request.hasPermission('admin.client.hiddenData.read')){

					response.json(clients.map((client) => {
						return client.toJSON({hiddenData: true});
					}));

				}else{

					response.json(clients.map((client) => {
						return client.toJSON();
					}));

				}

				return response.end();

			}else{
				return response.end('[]');
			}

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

	getOAuthClientById(request, response, next){
		this.OAuthClient.findOne({
			where   : {id: request.params.clientId},
			include : [{
				model   : this.User,
				as      : 'User',
				where   : {id: request.user.id}
			}]
		}).then((client) => {

			if(client){

				if(request.hasPermission('admin.client.hiddenData.read')){

					response.json(client.toJSON({hiddenData: true}));

				}else{

					response.json(client.toJSON());

				}

				return response.end();

			}else{
				return next(
					new this.errorController.errors.NotFoundError()
				);
			}

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}


	postOAuthClient(request, response, next){

		const secret = this.OAuthClient.generateSecret();
		let   promises = [];

		let   client = this.Client.build({
			name: request.body.client.name
		});

		client.setSecret(secret);
		client.setUser(request.user.id);

		if(
			request.hasPermissions(
				['admin.client.create', 'admin.client.hiddenData.write']
			)
		){

			if(request.body.client.userId){
				client.setUser(request.body.client.userId);
			}

			if(request.body.client.id){
				client.set('id', request.body.client.id);
			}
		}

		let uris = [];

		if(request.body.client.redirectUris){

			request.body.client.redirectUris.forEach((uri) => {

				uris.push(redirectUri = this.OAuthRedirectUri.build({
					uri: uri
				}));

			});

			uris.forEach((uri) => {
				promises.push(uri.save());
			});

			client.setOAuthRedirectUris(uris);
		}

		promises.push(client.save());

		Promise.all(promises).then(() => {

			let json = {};

			if(request.hasPermission('admin.client.hiddenData.read')){
				json = client.toJSON({hiddenData: true});
			}else{
				json = client.toJSON();
			}

			json.secret.secret = secret; //attach secret to response
			response.json(json);

			return response.end();

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	putOAuthClient(request, response, next){

		this.OAuthClient.findById(request.params.clientId)
		.then((client) => {

			if(client){

				if(request.hasPermissions(
					['admin.client.editOthers', 'admin.client.hiddenData.write'])
				){

					client.set(omitBy(pick(request.body.client, [
						'trusted'
					]), isNil));

				}else if(
					client.userId !== request.user.id &&
					!request.hasPermission('admin.client.editOthers')
				){
					return next(new this.errorController.errors.ForbiddenError());
				}

				client.set(omitBy(pick(request.body.client, [
					'name'
				]), isNil));

				let promises = [];

				if(request.body.client.redirectUris){
					const currentUris = client.getOAuthRedirectUris(),
					      newUris     = request.body.client.redirectUris;

					//To remove
					for(let i=0;i<currentUris.length;i++){
						if(newUris.indexOf(currentUris[i].get('uri')) === -1){
							promises.push(currentUris[i].destroy());
						}
					}

					//To add
					let tempCurrentUris = currentUris.map((uri) => {
						return uri.get('uri');
					});

					for(let i=0;i<newUris.length;i++){
						if(tempCurrentUris.indexOf(newUris[i]) === -1){
							let uri = this.OAuthRedirectUri.build({
								uri: newUris[i]
							});
							promises.push(uri.save());
							promises.push(client.addRedirectUri(uri));
						}
					}
				}

				promises.push(client.save());

				Promise.all(promises).then(() => {
					if(request.hasPermission('admin.client.hiddenData.read')){
						response.json(client.toJSON({hiddenData: true}));
					}else{
						response.json(client.toJSON());
					}

					return response.end();
				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});

			}else{
				return next(new this.errorController.errors.NotFoundError());
			}

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}), null);
		});

	}

	deleteOAuthClient(request, response, next){

		this.OAuthClient.findById(request.params.clientId)
		.then((client) => {

			if(client){

				if(
					client.userId === request.user.id ||
					request.hasPermission('admin.client.deleteOthers')
				){

					client.destroy().then(() => {

						response.json({success: true});
						response.end();

					}).catch((err) => {
						return next(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					});

				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}

			}else{
				return next(new this.errorController.errors.NotFoundError());
			}

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}
}

module.exports = OAuthClientController;
