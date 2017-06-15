const OAuthCode = ({ config, sequelize, models, cryptoUtilities }) => {
	const Sequelize = require("sequelize");

	let OAuthCode = sequelize.define(
		"oauth_code",
		{
			hash: {
				type: Sequelize.STRING
			},
			expires: {
				type: Sequelize.DATE
			}
		},
		{
			defaultScope: {
				/*include: [
					{
						model: models.User,
						as: "User"
					},
					{
						model: models.OAuthClient,
						as: "OAuthClient"
					}
				]*/
			},

			classMethods: {
				associate: function({ User, OAuthClient }) {
					this.belongsTo(User, {
						as: "User",
						foreignKey: "user_id"
					});
					this.belongsTo(OAuthClient, {
						as: "OAuthClient",
						foreignKey: "oauth_client_id"
					});
				},

				generateCode: function() {
					return cryptoUtilities.generateRandomString(config.TOKEN_LENGTH);
				},

				hashCode: function(code = "") {
					return cryptoUtilities.generateHash(code, false).hash;
				},

				findByCode: function(code = "") {
					return this.findOne({
						where: { hash: this.hashCode(code) }
					}).then(oauthCode => {
						return oauthCode;
					});
				}
			},

			instanceMethods: {
				toJSON: function(options = {}) {
					let code = this.get();

					let json = {
						id: code.id,
						expires: code.expires
					};

					if (options.owner || options.admin) {
						json.userId = code.user_id;

						if (code.User) {
							json.user = code.User.toJSON(options);
						}

						json.clientId = code.client_id;

						if (code.Client) {
							json.clientId = code.Client.toJSON(options);
						}
					}

					return json;
				}
			}
		}
	);

	return OAuthCode;
};

module.exports = OAuthCode;
