/**
 * Sends mails
 * @constructor
 */

class MailController {
	
	constructor({booki, config, nodemailer, errorController}){
	
		//store the passed parameters
		this.config				= config;
		this.errorController	= errorController;
		this.nodemailer			= nodemailer;
		
		booki.bindAll(this, ["sendMail"]);
		
		this.transporter		= this.nodemailer.createTransport({
			host				: this.config.MAIL_HOST,
		    port				: this.config.MAIL_PORT,
		    secure				: true,
		    auth: {
		        user			: this.config.MAIL_USER,
		        pass			: this.config.MAIL_PASSWORD
		    }
		});
		
	}
	
	/**
	 * Sends a mail if all the fields validate
	 * @function sendMail
	 * @param {Array} to - An array of recipients who will appear in the to field
	 * @param {String} subject - The subject of the email
	 * @param {String} html - The content of the email
	 * @param {String} text - The text version of the email
	 * @param {Array} cc - An array of recipients who will appear in the cc field
	 * @param {Array} bcc - An array of recipients who won't be displayed
	 * @param {Function} callback - A callback function that will be called after sending the mail or encountering an error
	 * @param {String} replyTo - A mail address to who the recipients should reply
	 * 
	 * @returns {undefined} The data is returned with the callback parameter
	 */
	sendMail(to, subject, html, text, callback, cc = [], bcc = [], replyTo = null){
		
		let data	= {
			from		: '"' + this.config.MAIL_FROM_NAME + '" <' + this.config.MAIL_USER + ">",
		};
		
		let requiredFields = [
			{ value: to, name: "to" }, { value: subject, name: "subject" }, { value: html, name: "html" },
			{ value: text, name: "text" }
		];
		
		let arrayFields	= [
			{ value: to, name: "to" }, { value: cc, name: "cc" }, { value: bcc , name: "bcc" }	
		];
		let stringFields = [
			{ value: subject, name: "subject" }, { value: html, name: "html" }, { value: text, name: "text" },
			{ value: replyTo, name: "replyTo" }
		];
		
		
		for(let i=0;i<requiredFields.length;i++){
			
			if(!requiredFields[i].value){
				callback(new this.errorController.errors.InputValidationError(), false);
			}
			
		}
		
		for(let i=0;i<arrayFields.length;i++){
			if(typeof arrayFields[i].value == "string"){
				data[arrayFields[i].name] = [arrayFields[i].value];
			}else if(arrayFields[i].value instanceof Array){
				data[arrayFields[i].name] = arrayFields[i].value;
			}
		}
		
		for(let i=0;i<stringFields.length;i++){
			if(stringFields[i].value && typeof stringFields[i].value == "string"){
				data[stringFields[i].name] = stringFields[i].value;
			}
		}
		
		this.transporter.sendMail(data, (error, info) => {
			if(error){
				return false;
			}
			
			callback(null, true);
		});
	}
};

module.exports = MailController;