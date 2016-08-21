var mongoose = require("mongoose");

function Email(key, options) {
	mongoose.SchemaType.call(this, key, options, "Email");
	
	//Regex from: http://stackoverflow.com/a/46181/2897827
	this.regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
}

Email.prototype = Object.create(mongoose.SchemaType.prototype);

Email.prototype.cast = function(value){
	
	if(this.regex.test(value)){
		return value;
	}else{
		throw new Error("The string " + value + " isn't an actual email!");
	}
	
	return false;
};

module.exports = Email;