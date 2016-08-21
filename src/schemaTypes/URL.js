var mongoose = require("mongoose");
var validUrl = require("valid-url");

function URL(key, options) {
	mongoose.SchemaType.call(this, key, options, "URL");
}

URL.prototype = Object.create(mongoose.SchemaType.prototype);

URL.prototype.cast = function(value){
	
	if(validUrl.isUri(value)){
		return value;
	}else{
		throw new Error("The string " + value + " doesn't look like an actual URL!");
	}
	
	return false;
};

module.exports = URL;