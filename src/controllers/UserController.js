/**
 * Holds the different user functions
 */

class UserController {

	constructor({
		booki, config, app, i18n, errorController, getLocale, models
	}){

		const bindAll           = require('lodash/bindAll');
		const pick              = require('lodash/pick');
		const omitBy            = require('lodash/omitBy');
		const isNil             = require('lodash/isNil');

		const async             = require('async');

		//store passed parameters
		this.config             = config;
		this.app                = app;
		this.i18n               = i18n;
		this.errorController    = errorController;

		this.getLocale          = getLocale;

		this.User               = models.User;
		this.PermissionRelation = models.PermissionRelation;
		this.Permission         = models.Permission;

		bindAll(this, [
			'getCurrentUser', 'getUser', 'getUserById',
			'postUser',       'putUser', 'deleteUser'
		]);
	}

	getCurrentUser(request, response){
		response.json(request.user.toJSON());
		response.end();
	}

	getUser(request, response, next){

		this.User.find({
			where: {name: request.body.filter.name}
		}).then((users) => {

			if(request.hasPermission('admin.user.hiddenData.read')){

				response.json(users.map((user) => {
					return user.toJSON({hiddenData: true});
				}));

			}else{

				response.json(users.map((user) => {
					return user.toJSON();
				}));

			}

			response.end();

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

	getUserById(request, response, next){

		this.User.findById(request.params.userId).then((user) => {

			if(request.hasPermission('admin.user.hiddenData.read')){
				response.json(user.toJSON({hiddenData: true}));
			}else{
				response.json(user.toJSON());
			}

			response.end();

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	postUser(request, response, next){

		//this function is for admins only so we need to accept any fields anyway

		let user = this.User.build(pick(request.body.user, [
			'id', 'nameDisplay', 'nameFirst', 'nameLast',
			'emailVerified', 'emailUnverified', 'emailVerificationCode',
			'locale', 'placeOfResidence'
		]));

		user.save().then(() => {

			//and add the permissions as well
			if(
				!request.body.user.permissions ||
				!Array.isArray(request.body.user.permissions)
			){
				request.body.user.permissions = [];
			}

			//asynchronously adding permissions
			async.each(request.body.user.permissions, (permission, callback) => {
				this.Permission.findOrCreate({
					where    : {permission: permission},
					defaults : {permission: permission}
				}).then((result) => {
					let permissionInstance = result[0], created = result[1];

					let relation = this.PermissionRelation.build({});
					relation.setUser(user);
					relation.setPermission(permission);

					relation.save().then(() => {
						callback(); //successfully added new relation
					}).catch((err) => {
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				}).catch((err) => {
					return callback(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});

			}, (error) => {
				if(error){
					return next(error);
				}

				//added relations, refreshing the user instance in order to include the
				//newly added permissions

				user.reload().then((user) => {

					if(request.hasPermission('admin.user.hiddenData.read')){
						response.json(user.toJSON({hiddenData: true}));
					}else{
						response.json(user.toJSON());
					}

				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});

			});

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	putUser(request, response, next){

		if(
			!request.hasPermission('admin.user.editOthers') &&
			request.params.userId !== request.user._id
		){
			return next(new this.errorController.errors.ForbiddenError());
		}

		this.User.findById(request.params.userId).then((user) => {

			if(!user){
				return next(new this.errorController.errors.NotFoundError());
			}


			let promises = [];

			//add normal fields

			user.set(omitBy(pick(request.body.user, [
				'nameDisplay', 'nameFirst', 'nameLast',
				'locale', 'placeOfResidence'
			]), isNil));


			//check for email / password change
			if(request.body.user.newEmail){
				user.set('emailUnverified', request.body.user.newEmail);

				promises.push(user.initEmailVerification());
			}

			if(request.body.user.newPassword === true){
				promises.push(user.initPasswordReset());
			}

			//update other fields as well if the user is allowed to
			if(request.hasPermission('admin.user.hiddenData.write')){
				//if the user has this permission we need to update more fields

				user.set(omitBy(pick(request.body.user, [
					'emailVerified', 'emailUnverified', 'emailVerificationCode'
				]), isNil));

				if(
					!request.body.user.permissions ||
					!Array.isArray(request.body.user.permissions)
				){
					request.body.user.permissions = [];
				}

				if(!request.hasPermission('admin.user.permissions.change')){
					newPermissions = []; //this will skip the permision changes
				}

				//to remove
				for(let i=0;i<relations.length;i++){
					if(newPermissions.indexOf(permissions[i]) === -1){//same indicies
						promises.push(relations[i].destroy());
					}
				}

				//to add
				async.each(newPermissions, (permission, callback) => {
					this.Permission.findOrCreate({
						where    : {permission: permission},
						defaults : {permission: permission}
					}).then((result) => {
						let permissionInstance = result[0], created = result[1];

						let relation = this.PermissionRelation.build({});
						relation.setUser(user);
						relation.setPermission(permission);

						relation.save().then(() => {
							callback(); //successfully added new relation
						}).catch((err) => {
							return callback(new this.errorController.errors.DatabaseError({
								message: err.message
							}));
						});

					}).catch((err) => {
						return callback(new this.errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				}, (error) => {
					if(error){
						return next(error);
					}

					promises.push(user.save());

					Promise.all(promises).then((user) => {

						//added relations, refreshing the user instance in order to reflect
						//the changes made
						user.reload().then((user) => {

							if(request.hasPermission('admin.user.hiddenData.read')){
								response.json(user.toJSON({hiddenData: true}));
							}else{
								response.json(user.toJSON());
							}

						}).catch((err) => {
							return next(new this.errorController.errors.DatabaseError({
								message: err.message
							}));
						});

					}).catch((err) => {
						return next(new this.errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				});

			}else{
				//if not return

				promises.push(user.save());

				Promise.all(promises).then(() => {

					//no need to reload() as all changes were made directly on the user
					//instance

					if(request.hasPermission('admin.user.hiddenData.read')){
						response.json(user.toJSON({hiddenData: true}));
					}else{
						response.json(user.toJSON());
					}

				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});

			}

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

	deleteUser(request, response, next){

		this.User.destroy({where: {id: request.params.userId}}).then(() => {

			response.json({success: true});
			response.end();

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});

	}

};

module.exports = UserController;
