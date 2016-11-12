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
		
		booki.bindAll(this, []);
	
		
	}
	
};

module.exports = UserController;