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
			charset: "utf8",
			collate: "utf8_unicode_ci"
		}
	);

	OAuthAccessToken.associate = function({ User, OAuthClient }) {
		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.belongsTo(OAuthClient, {
			as: "OAuthClient",
			foreignKey: "oauth_client_id"
		});
	};

	OAuthAccessToken.generateToken = function() {
		let token = cryptoUtilities.generateRandomString(config.TOKEN_LENGTH);
		//HTTP Headers can only contain ASCII and 19 specific seperators
		//http://stackoverflow.com/questions/19028068/illegal-characters-in-http-headers

		return token.replace(/[^A-z0-9()<>@,;:\\/"\[\]\?={}]/g, "@");
	};

	OAuthAccessToken.hashToken = function(token) {
		return cryptoUtilities.generateHash(token, false).hash;
	};

	OAuthAccessToken.findByToken = function(token) {
		return this.findOne({ where: { hash: this.hashToken(token) } });
	};

	OAuthAccessToken.prototype.toJSON = function(options = {}) {
		let token = this.get();

		let json = {
			id: token.id,
			expires: token.expires
		};

		if (options.owner || options.admin) {
			token.userId = token.user_id;
			token.clientId = token.client_id;

			if (token.User) {
				json.user = token.User.toJSON(options);
			}

			if (token.Client) {
				json.clientId = token.Client.get("id");
			}
		}

		return json;
	};

	return OAuthAccessToken;
};

module.exports = OAuthAccessToken;
