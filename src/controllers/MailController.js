/**
 * Sends mails
 * @constructor
 */

var MailController = function(errors){
	
	var self			= this;
	
	//store the passed parameters
	self.errors			= errors;
	
	//Load modules
	self.nodemailer		= require("nodemailer");
	
	//init variables
	self.config			= require("../../config.json");
	
	self.transporter	= self.nodemailer.createTransport({
		host				: self.config.MAIL_HOST,
	    port				: self.config.MAIL_PORT,
	    secure: true,
	    auth: {
	        user			: self.config.MAIL_USER,
	        pass			: self.config.MAIL_PASSWORD
	    }
	});
};

/**
 * Sends a mail if all the fields validate
 * @function sendMail
 * @param {Array} to - An array of recipients who will appear in the to field
 * @param {Array} cc - An array of recipients who will appear in the cc field
 * @param {Array} bcc - An array of recipients who won't be displayed
 * @param {String} subject - The subject of the email
 * @param {String} html - The content of the email
 * @param {String} replyTo - A mail address to who the recipients should reply
 * @param {Function} callback - A callback function that will be called after
 * sending the mail or encountering an error
 * @returns {undefined} The data is returned with the callback parameter
 */
MailController.prototype.sendMail = function(to, cc, bcc, subject, html, replyTo, callback){
	var self	= this;
	
	var data	= {
		from		: '"' + self.config.MAIL_FROM_NAME + '" <' + self.config.MAIL_USER + ">"
	};
	
	var i;
	
	var requiredFields = [
		{ value: to, name: "to" }, { value: subject, name: "subject" }, { value: html, name: "html" }
	];
	
	var arrayFields	= [
		{ value: to, name: "to" }, { value: cc, name: "cc" }, { value: bcc , name: "bcc" }	
	];
	var stringFields = [
		{ value: subject, name: "subject" }, { value: html, name: "html" },
		{ value: replyTo, name: "replyTo" }
	];
	
	
	for(i=0;i<requiredFields.length;i++){
		if(!requiredFields[i].value){
			callback(new self.errors.err.InputValidationError(), false);
		}
	}
	
	for(i=0;i<arrayFields.length;i++){
		if(typeof arrayFields[i].value == "string"){
			data[arrayFields[i].name] = [arrayFields[i].value];
		}else if(arrayFields[i].value instanceof Array){
			data[arrayFields[i].name] = arrayFields[i].value;
		}
	}
	
	for(i=0;i<stringFields.length;i++){
		if(stringFields[i].value && typeof stringFields[i].value == "string"){
			data[stringFields[i].name] = stringFields[i].value;
		}
	}
	
	
	self.transporter.sendMail(data, function(error, info){
		if(error){
			return false;
		}
		
		callback(null, true);
	});
};

module.exports = MailController;