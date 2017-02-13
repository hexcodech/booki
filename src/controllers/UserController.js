/**
 * Holds the different user functions
 */

class UserController {
	
	constructor({booki, config, app, i18n, mongoose, errorController, getLocale, createObjectWithOptionalKeys}){
	
		//store passed parameters
		this.config							= config;
		this.app							= app;
		this.i18n							= i18n;
		this.mongoose						= mongoose;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		this.createObjectWithOptionalKeys	= createObjectWithOptionalKeys;
		
		this.User							= mongoose.model("User");
		
		booki.bindAll(this, ["getCurrentUser", "getUser", "getUserById", "postUser", "putUser", "deleteUser"]);
	}
	
	getCurrentUser(request, response){
		response.json(request.user.toJSON());
		response.end();
	}
	
	getUser(request, response, next){
		
		let filter;
		
		if(request.hasPermission("admin.user.filters")){
			
			filter = request.body.filter;
			
		}else{
			
			filter = {
				name: request.body.filter.name
			};
			
		}
		
		this.User.find(filter, (err, users) => { //I'm sure there's a way to exploit this.. I don't like it
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(request.hasPermission("admin.user.rawData.read")){
				
				response.json(users.map((user) => {
					return user.toJSON({rawData: true});
				}));
				
			}else{
				
				response.json(users.map((user) => {
					return user.toJSON();
				}));
				
			}
			
			response.end();
		});
	}
	
	getUserById(request, response, next){
		
		this.User.findById(request.params.userId, (err, user) => {
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(request.hasPermission("admin.user.rawData.read")){
				response.json(user.toJSON({rawData: true}));
			}else{
				response.json(user.toJSON());
			}
			
			response.end();
			
		});
		
	}
	
	postUser(request, response, next){
		let user = new this.User(request.body.user);
		
		user.save((err, user) => {
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(request.hasPermission("admin.user.rawData.read")){
				response.json(user.toJSON({rawData: true}));
			}else{
				response.json(user.toJSON());
			}
			
			response.end();
		});
	}
	
	putUser(request, response, next){
		
		let newUserData;
		
		if(request.hasPermissions(["admin.user.editOthers", "admin.user.rawData.write"])){
			
			newUserData = request.body.user;
									
		}else if(request.params.userId === request.user._id || request.hasPermission("admin.user.editOthers")){
			
			newUserData = createObjectWithOptionalKeys(request.body.user, ["name", "locale", "placeOfResidence", "profilePictureUrl"]);
			
		}else{
			//not allowed
			return next(new this.errorController.errors.ForbiddenError());
		}
		
		
		
		let {newPassword, newEmail} = request.body.user;
			
		if(newEmail){
			newUserData.email = {
				unverified: newEmail
			};
		}
		
		//email and password are handled seperately
		
		this.User.findByIdAndUpdate(request.params.userId, newUserData, {new: true}, (err, user) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(user){
				
				if(newPassword === true){
					user.initPasswordReset((error, success) => { //async
						if(error){
							console.log(error);
						}
						
					});
				}
				
				if(newEmail && user.email.unverified !== ""){
					user.initEmailVerification((error, success) => { //async
						if(error){
							console.log(error);
						}
						
					});
				}
				
				if(request.hasPermission("admin.user.rawData.read")){
					response.json(user.toJSON({rawData: true}));
				}else{
					response.json(user.toJSON());
				}
				
				response.end();
				
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
			
		});
		
	}
	
	deleteUser(request, response, next){
		
		//findByIdAndRemove doesn't call mongoose middlewares for a real cleanup.. https://github.com/Automattic/mongoose/issues/964
		
		this.User.findById(request.params.userId, (err, user) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			user.remove((err) => {
				if(err){
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				response.json({success: true});
				response.end();
				
			});
			
		});
	}
	
};

module.exports = UserController;