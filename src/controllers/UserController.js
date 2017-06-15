/**
 * Holds the different user functions
 */

class UserController {
	constructor({ booki, config, app, i18n, errorController, models }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		//store passed parameters
		this.config = config;
		this.app = app;
		this.i18n = i18n;
		this.errorController = errorController;

		this.models = models;

		bindAll(this, [
			"getCurrentUser",
			"getUser",
			"getUserById",
			"postUser",
			"putUser",
			"deleteUser"
		]);
	}

	getCurrentUser(request, response, next) {
		this.models.User
			.findOne({
				where: { id: request.user.get("id") },
				include: [
					{
						model: this.models.Permission,
						as: "Permissions"
					},
					{
						model: this.models.Image,
						as: "ProfilePicture"
					},
					{
						model: this.models.OAuthProvider,
						as: "OAuthProviders"
					},
					{
						model: this.models.Offer,
						as: "Offers"
					},
					{
						model: this.models.OfferRequest,
						as: "OfferRequests"
					}
				]
			})
			.then(user => {
				response.json(user.toJSON({ owner: true }));
				response.end();
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	getUser(request, response, next) {
		let query = {};

		if (request.hasPermission("admin.user.query")) {
			query = request.body.query;
		} else {
			query.name = request.body.query.name;
		}

		this.models.User
			.findAll({
				where: query,
				include: [
					{
						model: this.models.Permission,
						as: "Permissions"
					},
					{
						model: this.models.Image,
						as: "ProfilePicture"
					},
					{
						model: this.models.OAuthProvider,
						as: "OAuthProviders"
					}
				]
			})
			.then(users => {
				if (request.hasPermission("admin.user.read")) {
					response.json(
						users.map(user => {
							return user.toJSON({ admin: true });
						})
					);
				} else {
					response.json(
						users.map(user => {
							return user.toJSON();
						})
					);
				}

				response.end();
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	getUserById(request, response, next) {
		if (request.user.get("id") === request.params.userId) {
			return this.getCurrentUser(request, response, next);
		}

		this.models.User
			.findOne({
				where: { id: request.params.userId },
				include: [
					{
						model: this.models.Permission,
						as: "Permissions"
					},
					{
						model: this.models.Image,
						as: "ProfilePicture"
					},
					{
						model: this.models.OAuthProvider,
						as: "OAuthProviders"
					},
					{
						model: this.models.Offer,
						as: "Offers"
					},
					{
						model: this.models.OfferRequest,
						as: "OfferRequests"
					}
				]
			})
			.then(user => {
				if (request.hasPermission("admin.user.read")) {
					response.json(user.toJSON({ admin: true }));
				} else {
					response.json(user.toJSON());
				}

				response.end();
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	postUser(request, response, next) {
		//this function is for admins only so we can accept any fields

		let user = this.models.User.build(
			this.pick(request.body.user, [
				"id",
				"nameDisplay",
				"nameFirst",
				"nameLast",
				"emailVerified",
				"emailUnverified",
				"emailVerificationCode",
				"locale"
			])
		);

		if (request.body.user.profilePictureId) {
			user.profile_picture_id = request.body.user.profilePictureId;
		}

		user
			.save()
			.then(() => {
				//and add the permissions as well
				if (
					!request.body.user.permissions ||
					!Array.isArray(request.body.user.permissions)
				) {
					request.body.user.permissions = [];
				}

				user
					.setPermissionsRaw(request.body.user.permissions)
					.then(() => {
						//added relations, refreshing the user instance in order to include the
						//newly added permissions

						user
							.reload({
								include: [
									{
										model: this.models.Permission,
										as: "Permissions"
									},
									{
										model: this.models.Image,
										as: "ProfilePicture"
									},
									{
										model: this.models.OAuthProvider,
										as: "OAuthProviders"
									},
									{
										model: this.models.Offer,
										as: "Offers"
									},
									{
										model: this.models.OfferRequest,
										as: "OfferRequests"
									}
								]
							})
							.then(() => {
								if (request.hasPermission("admin.user.read")) {
									response.json(user.toJSON({ admin: true }));
								} else {
									response.json(user.toJSON({ owner: true }));
								}
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

	putUser(request, response, next) {
		if (
			!request.hasPermission("admin.user.editOthers") &&
			request.params.userId !== request.user.get("id")
		) {
			return next(new this.errorController.errors.ForbiddenError());
		}

		this.models.User
			.findOne({
				where: { id: request.params.userId },
				include: [
					{
						model: this.models.Permission,
						as: "Permissions"
					},
					{
						model: this.models.Image,
						as: "ProfilePicture"
					},
					{
						model: this.models.OAuthProvider,
						as: "OAuthProviders"
					},
					{
						model: this.models.Offer,
						as: "Offers"
					},
					{
						model: this.models.OfferRequest,
						as: "OfferRequests"
					}
				]
			})
			.then(user => {
				if (!user) {
					return next(new this.errorController.errors.NotFoundError());
				}

				let promises = [];

				//add normal fields

				user.set(
					this.omitBy(
						this.pick(request.body.user, [
							"nameDisplay",
							"nameFirst",
							"nameLast",
							"locale"
						]),
						this.isNil
					)
				);

				if (request.body.user.profilePictureId) {
					user.profile_picture_id = request.body.user.profilePictureId;
				}

				//check for email / password change
				if (request.body.user.newEmail) {
					user.set("emailUnverified", request.body.user.newEmail);

					promises.push(user.initEmailVerification());
				}

				if (request.body.user.newPassword === true) {
					promises.push(user.initPasswordReset());
				}

				//update other fields as well if the user is allowed to
				if (request.hasPermission("admin.user.write")) {
					//if the user has this permission we need to update more fields

					user.set(
						this.omitBy(
							this.pick(request.body.user, [
								"emailVerified",
								"emailUnverified",
								"emailVerificationCode"
							]),
							this.isNil
						)
					);

					if (
						!request.body.user.permissions ||
						!Array.isArray(request.body.user.permissions)
					) {
						request.body.user.permissions = [];
					}

					if (!request.hasPermission("admin.user.permissions.change")) {
						//this will skip the permision changes
						request.body.user.permissions = [];
					}

					Promise.all([
						user.save(),
						user.setPermissionsRaw(request.body.user.permissions)
					])
						.then(() => {
							//added relations, refreshing the user instance in order to include
							//the newly added permissions

							user
								.reload({
									include: [
										{
											model: this.models.Permission,
											as: "Permissions"
										},
										{
											model: this.models.Image,
											as: "ProfilePicture"
										},
										{
											model: this.models.OAuthProvider,
											as: "OAuthProviders"
										},
										{
											model: this.models.Offer,
											as: "Offers"
										},
										{
											model: this.models.OfferRequest,
											as: "OfferRequests"
										}
									]
								})
								.then(() => {
									if (request.hasPermission("admin.user.read")) {
										response.json(user.toJSON({ admin: true }));
									} else {
										response.json(user.toJSON({ owner: true }));
									}
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
					//if not return

					promises.push(user.save());

					Promise.all(promises)
						.then(() => {
							//no need to reload() as all changes were made directly on the user
							//instance

							if (request.hasPermission("admin.user.read")) {
								response.json(user.toJSON({ admin: true }));
							} else {
								response.json(user.toJSON());
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
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	deleteUser(request, response, next) {
		this.models.User
			.destroy({ where: { id: request.params.userId } })
			.then(() => {
				response.json({ success: true });
				response.end();
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

module.exports = UserController;
