const OAuthAccessToken = ({ config, sequelize, models, cryptoUtilities }) => {
	const Sequelize = require("sequelize");

	let OAuthAccessToken = sequelize.define(
		"oauth_access_token",
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
				include: []
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
				generateToken: function() {
					let token = cryptoUtilities.generateRandomString(config.TOKEN_LENGTH);
					//HTTP Headers can only contain ASCII and 19 specific seperators
					//http://stackoverflow.com/questions/19028068/illegal-characters-in-http-headers

					return token.replace(/[^A-z0-9()<>@,;:\\/"\[\]\?={}]/g, "@");
				},
				hashToken: function(token) {
					return cryptoUtilities.generateHash(token, false).hash;
				},
				findByToken: function(token) {
					return this.findOne({ where: { hash: this.hashToken(token) } });
				}
			},
			instanceMethods: {
				toJSON: function(options = {}) {
					let token = this.get();

					let json = {
						id: token.id,
						expires: token.expires
					};

					if (token.User) {
						json.user = token.User.toJSON(options);
					}

					if (token.Client) {
						json.clientId = token.Client.get("id");
					}

					return json;
				}
			}
		}
	);

	return OAuthAccessToken;
};

module.exports = OAuthAccessToken;
