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
				/*include: [
					{
						model: models.Offer,
						as: "Offer"
					},
					{
						model: models.User,
						as: "User"
					}
				]*/
			},
			classMethods: {
				generateResponseKey: function() {
					return cryptoUtilities
						.generateRandomString(config.CONFIRM_TOKEN_LENGTH)
						.replace(/[^A-z0-9]/, "$");
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

					const offer = this.get("Offer"),
						offerer = offer.get("User"),
						requester = this.get("User");

					return models.Book
						.findOne({ where: { id: offer.book_id } })
						.then(book => {
							return offerRequestMail
								.render(
									{
										request: this.get(),
										offerer: offerer.get(),
										requester: requester.get(),
										book: book.get(),
										offer: offer.get(),
										responseUrl:
											config.HOST +
												"/v1/offer-request/" +
												this.get("id") +
												"/respond?responseKey=" +
												this.get("responseKey")
									},
									offerer.get("locale")
								)
								.catch(err => {
									return Promise.reject(
										new errorController.errors.RenderError({
											message: err.message
										})
									);
								})
								.then(result => {
									return offerer.sendMail(
										result.subject,
										result.html,
										result.text
									);
								});
						});
				},
				toJSON: function(options = {}) {
					let offerRequest = this.get();

					let json = pick(offerRequest, [
						"id",
						"message",
						"responded",
						"updatedAt",
						"createdAt"
					]);

					json.userId = offerRequest.user_id;

					if (offerRequest.User) {
						json.user = offerRequest.User.toJSON(options);
					}

					json.offerId = offerRequest.offer_id;
					if (offerRequest.Offer) {
						json.offer = offerRequest.Offer.toJSON(options);
					}

					return json;
				}
			}
		}
	);

	return OfferRequest;
};

module.exports = OfferRequest;
