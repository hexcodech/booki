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
		
		this.User							= this.mongoose.model("User");
		
		booki.bindAll(this, ["getCurrentUser", "getUser", "getUserById", "postUser", "putUser", "deleteUser"]);
	}
	
	getCurrentUser(request, response){
		response.json(request.user.toJSON());
		response.end();
	}
	
	getUser(request, response, next){
		
		let filter;
		
		if(request.user.hasCapability("use-arbitrary-filters")){
			
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
			
			if(request.user.hasCapability("access-raw-data")){
				
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
			
			if(request.user.hasCapability("access-raw-data")){
				response.json(user.toJSON({rawData: true}));
			}else{
				response.json(user.toJSON());
			}
			
			response.end();
			
		});
		
	}
	
	postUser(request, response, next){
		let user = new this.User(request.user);
		
		user.save((err, user) => {
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(request.user.hasCapability("access-raw-data")){
				response.json(user.toJSON({rawData: true}));
			}else{
				response.json(user.toJSON());
			}
			
			response.end();
		});
	}
	
	putUser(request, response, next){
		
		if(request.user.hasCapabilities(["edit-other-users", "access-raw-data"])){
			
			this.User.findByIdAndUpdate(request.params.userId, request.body.user, {new: true}, (err, user) => {
			
				if(err){
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				response.json(user.toJSON({rawData: true}));
				
				response.end();
			});
			
		}else if(request.params.userId === request.user._id){
			
			let newUserData = createObjectWithOptionalKeys(request.body.user, ["name", "locale", "placeOfResidence", "profilePictureUrl"]);
			
			if(newEmail){
				newUserData.email = {
					unverified: newEmail
				};
			}
			
			//email and password are handled seperately
			
			this.User.findByIdAndUpdate(request.user._id, newUserData, {new: true}, (err, user) => {
				
				if(err){
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}), null);
				}
				
				let {newPassword, newEmail} = request.body.user;
				
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
				
				if(request.user.hasCapability("access-raw-data")){
					response.json(user.toJSON({rawData: true}));
				}else{
					response.json(user.toJSON());
				}
				
				response.end();
				
			});
			
			
		}else{
			//not allowed
			next(new this.errorController.errors.ForbiddenError());
		}
	}
	
	deleteUser(request, response, next){
		this.User.findByIdAndRemove(request.params.userId, (err) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			reponse.json({success: true});
			response.end();
		});
	}
	
};

module.exports = UserController;