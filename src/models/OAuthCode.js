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
			charset: "utf8",
			collate: "utf8_unicode_ci",
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
			}
		}
	);

	OAuthCode.associate = function({ User, OAuthClient }) {
		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.belongsTo(OAuthClient, {
			as: "OAuthClient",
			foreignKey: "oauth_client_id"
		});
	};

	OAuthCode.generateCode = function() {
		return cryptoUtilities.generateRandomString(config.TOKEN_LENGTH);
	};

	OAuthCode.hashCode = function(code = "") {
		return cryptoUtilities.generateHash(code, false).hash;
	};

	OAuthCode.findByCode = function(code = "") {
		return this.findOne({
			where: { hash: this.hashCode(code) }
		}).then(oauthCode => {
			return oauthCode;
		});
	};

	OAuthCode.prototype.toJSON = function(options = {}) {
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
	};

	return OAuthCode;
};

module.exports = OAuthCode;
