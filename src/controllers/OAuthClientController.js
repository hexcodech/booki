class OAuthClientController {
	constructor({
		booki,
		config,
		errorController,
		getLocale,
		generateRandomString,
		models
	}) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.config = config;
		this.errorController = errorController;

		this.getLocale = getLocale;
		this.generateRandomString = generateRandomString;

		this.models = models;

		bindAll(this, [
			"getOAuthClient",
			"postOAuthClient",
			"getOAuthClientById",
			"putOAuthClient",
			"deleteOAuthClient"
		]);
	}

	getOAuthClient(request, response, next) {
		let query = {},
			userId = null;

		if (request.hasPermission("admin.client.query")) {
			query = request.body.query;
		} else {
			query = this.pick(request.body.client, ["id", "name", "trusted"]);
		}

		if (!request.hasPermission("admin.client.list")) {
			userId = request.user.id;
		}

		if (userId) {
			query.user_id = userId;
		}

		this.models.OAuthClient
			.findAll({
				where: query,
				include: [
					{
						model: this.models.OAuthRedirectUri,
						as: "OAuthRedirectUris"
					}
				]
			})
			.then(clients => {
				if (clients) {
					if (request.hasPermission("admin.client.read")) {
						response.json(
							clients.map(client => {
								return client.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							clients.map(client => {
								return client.toJSON({ owner: true });
							})
						);
					}

					return response.end();
				} else {
					return response.end("[]");
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	getOAuthClientById(request, response, next) {
		let query = { id: request.params.clientId };

		if (!request.hasPermission("admin.client.list")) {
			query.user_id = request.user.id;
		}

		this.models.OAuthClient
			.findOne({
				where: query,
				include: [
					{
						model: this.models.OAuthRedirectUri,
						as: "OAuthRedirectUris"
					}
				]
			})
			.then(client => {
				if (client) {
					if (request.hasPermission("admin.client.read")) {
						response.json(
							client.toJSON({
								admin: true,
								owner: client.user_id === request.user.id
							})
						);
					} else {
						response.json(
							client.toJSON({ owner: client.user_id === request.user.id })
						);
					}

					return response.end();
				} else {
					return next(new this.errorController.errors.NotFoundError());
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	postOAuthClient(request, response, next) {
		const secret = this.models.OAuthClient.generateSecret();
		let promises = [];

		let client = this.models.OAuthClient.build({
			name: request.body.client.name,
			user_id: request.user.id
		});

		client.setSecret(secret);

		if (request.hasPermissions(["admin.client.create", "admin.client.write"])) {
			if (request.body.client.userId) {
				client.set("user_id", request.body.client.userId);
			}

			client.set(
				this.omitBy(
					this.pick(request.body.client, ["id", "trusted"]),
					this.isNil
				)
			);
		}

		client
			.save()
			.then(() => {
				let uris = [];

				if (request.body.client.redirectUris) {
					request.body.client.redirectUris.forEach(uri => {
						promises.push(
							this.models.OAuthRedirectUri.create({
								uri: uri,
								oauth_client_id: client.get("id")
							})
						);
					});
				}

				Promise.all(promises)
					.then(() => {
						client
							.reload({
								include: [
									{
										model: this.models.OAuthRedirectUri,
										as: "OAuthRedirectUris"
									}
								]
							})
							.then(() => {
								let json = {};

								if (request.hasPermission("admin.client.read")) {
									json = client.toJSON({ admin: true });
								} else {
									json = client.toJSON({ owner: true });
								}

								json.secret = secret; //attach secret to response
								response.json(json);

								return response.end();
							})
							.catch(err => {
								return next(
									new this.errorController.errors.DatabaseError({
										message: err.message
									})
								);
							});
					})
					.catch(err => {
						return next(
							new this.errorController.errors.DatabaseError({
								message: err.message
							})
						);
					});
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	putOAuthClient(request, response, next) {
		this.models.OAuthClient
			.findOne({
				where: { id: request.params.clientId },
				include: [
					{
						model: this.models.OAuthRedirectUri,
						as: "OAuthRedirectUris"
					}
				]
			})
			.then(client => {
				if (client) {
					let promises = [];

					if (
						request.hasPermissions([
							"admin.client.editOthers",
							"admin.client.write"
						])
					) {
						client.set(
							this.omitBy(
								this.pick(request.body.client, ["id", "trusted"]),
								this.isNil
							)
						);

						if (request.body.client.userId) {
							promises.push(client.setUser(request.body.client.userId));
						}
					} else if (
						client.userId !== request.user.id &&
						!request.hasPermission("admin.client.editOthers")
					) {
						return next(new this.errorController.errors.ForbiddenError());
					}

					client.set(
						this.omitBy(this.pick(request.body.client, ["name"]), this.isNil)
					);

					if (request.body.client.redirectUris) {
						const currentUris = client.get("OAuthRedirectUris"),
							newUris = request.body.client.redirectUris;

						//To remove
						for (let i = 0; i < currentUris.length; i++) {
							if (newUris.indexOf(currentUris[i].get("uri")) === -1) {
								promises.push(currentUris[i].destroy());
							}
						}

						//To add
						let tempCurrentUris = currentUris.map(uri => {
							return uri.get("uri");
						});

						for (let i = 0; i < newUris.length; i++) {
							if (tempCurrentUris.indexOf(newUris[i]) === -1) {
								let uri = this.models.OAuthRedirectUri.build({
									uri: newUris[i],
									oauth_client_id: client.get("id")
								});

								promises.push(uri.save());
							}
						}
					}

					promises.push(client.save());

					Promise.all(promises)
						.then(() => {
							client
								.reload({
									include: [
										{
											model: models.OAuthRedirectUri,
											as: "OAuthRedirectUris"
										}
									]
								})
								.then(() => {
									if (request.hasPermission("admin.client.read")) {
										response.json(client.toJSON({ admin: true }));
									} else {
										response.json(client.toJSON({ owner: true }));
									}

									return response.end();
								})
								.catch(err => {
									return next(
										new this.errorController.errors.DatabaseError({
											message: err.message
										})
									);
								});
						})
						.catch(err => {
							return next(
								new this.errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});
				} else {
					return next(new this.errorController.errors.NotFoundError());
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					}),
					null
				);
			});
	}

	deleteOAuthClient(request, response, next) {
		this.models.OAuthClient
			.findOne({ where: { id: request.params.clientId } })
			.then(client => {
				if (client) {
					if (
						client.userId === request.user.id ||
						request.hasPermission("admin.client.deleteOthers")
					) {
						client
							.destroy()
							.then(() => {
								response.json({ success: true });
								response.end();
							})
							.catch(err => {
								return next(
									new this.errorController.errors.DatabaseError({
										message: err.message
									}),
									null
								);
							});
					} else {
						return next(new this.errorController.errors.ForbiddenError());
					}
				} else {
					return next(new this.errorController.errors.NotFoundError());
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}
}

module.exports = OAuthClientController;
