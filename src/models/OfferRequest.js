const OfferRequest = ({
	config,
	sequelize,
	models,
	errorController,
	cryptoUtilities
}) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	const EmailTemplate = require("email-templates").EmailTemplate;

	let OfferRequest = sequelize.define(
		"offer_request",
		{
			message: {
				type: Sequelize.STRING(2000),
				default: ""
			},
			responseKey: {
				type: Sequelize.STRING,
				default: ""
			},
			responded: {
				type: Sequelize.BOOLEAN,
				default: false
			}
		},
		{
			defaultScope: {
				include: [
					{
						model: models.Offer,
						as: "Offer"
					},
					{
						model: models.User,
						as: "User"
					}
				]
			},
			classMethods: {
				generateResponseKey: function() {
					return cryptoUtilities.generateRandomString(
						config.CONFIRM_TOKEN_LENGTH
					);
				},
				associate: function({ Offer, User }) {
					this.belongsTo(Offer, {
						as: "Offer",
						foreignKey: "offer_id"
					});
					this.belongsTo(User, {
						as: "User",
						foreignKey: "user_id"
					});
				}
			},
			instanceMethods: {
				sendMail: function() {
					let offerRequestMail = new EmailTemplate(
						__dirname + "/../templates/emails/offer-request"
					);

					return resetMail
						.render(
							{
								request: this.get(),
								offerer: this.get("Offer").get("User").get(),
								requester: this.get("User").get(),
								book: this.get("Offer").get("Book").get(),
								offer: this.get("Offer").get(),
								responseUrl: config.HOST +
									"/v1/offer-request/" +
									this.get("id") +
									"/respond?respondKey=" +
									this.get("respondKey")
							},
							offerer.get("locale")
						)
						.then(result => {
							return offerer
								.sendMail(result.subject, result.html, result.text)
								.catch(error => {
									throw error;
								});
						})
						.catch(err => {
							throw new errorController.errors.RenderError({
								message: err.message
							});
						});
				},
				toJSON: function(options) {
					let offerRequest = this.get();

					let json = pick(offerRequest, [
						"id",
						"message",
						"sold",
						"responded",
						"updatedAt",
						"createdAt"
					]);

					json.userId = offer.user_id;
					json.offerId = offer.offer_id;

					return json;
				}
			}
		}
	);

	return OfferRequest;
};

module.exports = OfferRequest;
