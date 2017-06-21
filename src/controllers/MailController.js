/**
 * Sends mails
 * @constructor
 */

class MailController {
	constructor(config) {
		const bindAll = require("lodash/bindAll");
		const nodemailer = require("nodemailer");

		//store the passed parameters
		this.config = config;

		bindAll(this, ["sendMail"]);

		this.transporter = nodemailer.createTransport({
			host: this.config.MAIL_HOST,
			port: this.config.MAIL_PORT,
			secure: true,
			auth: {
				user: this.config.MAIL_USER,
				pass: this.config.MAIL_PASSWORD
			}
		});
	}

	sendMail(
		to = "",
		subject = "",
		html = "",
		text = "",
		cc = [],
		bcc = [],
		replyTo = null
	) {
		console.log("sendMail");
		return new Promise((resolve, reject) => {
			let data = {
				from:
					'"' + this.config.MAIL_FROM_NAME + '" <' + this.config.MAIL_USER + ">"
			};

			let requiredFields = [
				{ value: to, name: "to" },
				{ value: subject, name: "subject" },
				{ value: html, name: "html" },
				{ value: text, name: "text" }
			];

			let arrayFields = [
				{ value: to, name: "to" },
				{ value: cc, name: "cc" },
				{ value: bcc, name: "bcc" }
			];
			let stringFields = [
				{ value: subject, name: "subject" },
				{ value: html, name: "html" },
				{ value: text, name: "text" },
				{ value: replyTo, name: "replyTo" }
			];

			for (let i = 0; i < requiredFields.length; i++) {
				if (!requiredFields[i].value) {
					return reject(
						new Error(
							requiredFields[i].value + " is required to send the email!"
						)
					);
				}
			}

			for (let i = 0; i < arrayFields.length; i++) {
				if (typeof arrayFields[i].value == "string") {
					data[arrayFields[i].name] = [arrayFields[i].value];
				} else if (arrayFields[i].value instanceof Array) {
					data[arrayFields[i].name] = arrayFields[i].value;
				}
			}

			for (let i = 0; i < stringFields.length; i++) {
				if (stringFields[i].value && typeof stringFields[i].value == "string") {
					data[stringFields[i].name] = stringFields[i].value;
				}
			}

			console.log("sending: " + data);

			this.transporter.sendMail(data, (err, info) => {
				console.log(err, info);
				if (err) {
					return reject(err);
				}

				resolve();
			});
		});
	}
}

module.exports = MailController;
