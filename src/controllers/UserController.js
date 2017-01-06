/**
 * Holds the different user functions
 */

class UserController {
	
	constructor({booki, config, app, i18n, mongoose, errorController, getLocale}){
	
		//store passed parameters
		this.config							= config;
		this.app							= app;
		this.i18n							= i18n;
		this.mongoose						= mongoose;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		
		this.User							= this.mongoose.model("User");
		
		booki.bindAll(this, ["getCurrentUser", "getUser"]);
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
		
		if(request.user.hasCapability("edit-other-users")){
			
			this.User.findByIdAndUpdate(request.params.userId, request.body.user, {new: true}, (err, user) => {
			
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
			
		}else if(request.params.userId === request.user._id){
			//pseudo update user
			
			let user = {
				name				: request.body.user.name,
				locale				: request.body.user.locale,
				placeOfResidence	: request.body.user.placeOfResidence,
				profilePictureURL	: request.body.user.profilePictureURL
			};
			
			//email and password are handled seperately
			
			this.User.findByIdAndUpdate(request.user._id, user, {new: true}, (err, user){
				
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
				
				let {newPassword, email} = request.body.user;
				
				if(newPassword === true){
					user.initPasswordReset();
				}
				
				response.end();
				
			});
			
			
		}else{
			//not allowed
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