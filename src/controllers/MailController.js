/**
 * Sends mails
 * @constructor
 */

class MailController {
	constructor(config, errorController) {
		const bindAll = require("lodash/bindAll");

		//TODO change package because of promises and a strange license
		//https://github.com/nodemailer/nodemailer

		const nodemailer = require("nodemailer");

		//store the passed parameters
		this.config = config;
		this.errorController = errorController;

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
		return new Promise((resolve, reject) => {
			let data = {
				from: '"' +
					this.config.MAIL_FROM_NAME +
					'" <' +
					this.config.MAIL_USER +
					">"
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
					return reject(new this.errorController.errors.InputValidationError());
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

			this.transporter.sendMail(data, (error, info) => {
				if (error) {
					return reject(
						new this.errorController.errors.ApiError({
							message: error.message
						})
					);
				}

				resolve();
			});
		});
	}
}

module.exports = MailController;
