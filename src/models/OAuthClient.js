const OAuthClient = ({ config, sequelize, models, cryptoUtilities }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	let OAuthClient = sequelize.define(
		"oauth_client",
		{
			/* Name */
			name: {
				type: Sequelize.STRING
			},

			/* Secret */

			secretHash: {
				type: Sequelize.STRING
			},

			secretSalt: {
				type: Sequelize.STRING
			},

			secretAlgorithm: {
				type: Sequelize.STRING
			},

			/* Trusted */

			trusted: {
				type: Sequelize.BOOLEAN,
				default: false
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
						model: models.OAuthRedirectUri,
						as: "OAuthRedirectUris"
					}
				]*/
			}
		}
	);

	OAuthClient.associate = function({
		User,
		OAuthCode,
		OAuthAccessToken,
		OAuthRedirectUri
	}) {
		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.hasMany(OAuthCode, {
			as: "OAuthCodes",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});
		this.hasMany(OAuthAccessToken, {
			as: "OAuthAccessTokens",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});
		this.hasMany(OAuthRedirectUri, {
			as: "OAuthRedirectUris",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});
	};

	OAuthClient.generateSecret = function() {
		return cryptoUtilities.generateRandomString(config.CLIENT_SECRET_LENGTH);
	};

	OAuthClient.prototype.setSecret = function(secret) {
		let { hash, salt, algorithm } = cryptoUtilities.generateHash(secret);

		this.set({
			secretHash: hash,
			secretSalt: salt,
			secretAlgorithm: algorithm
		});
	};

	OAuthClient.prototype.verifySecret = function(secret) {
		let { hash } = cryptoUtilities.generateHash(
			secret,
			this.get("secretSalt"),
			this.get("secretAlgorithm")
		);

		let {
			hash: newHash,
			algorithm: newAlgorithm
		} = cryptoUtilities.generateHash(secret, this.get("secretSalt"));

		if (this.get("secretHash") && hash === this.get("secretHash")) {
			if (this.get("secretAlgorithm") !== newAlgorithm) {
				//if the algorithm changed, update the hash
				this.set({
					secretHash: newHash,
					secretSalt: salt,
					secretAlgorithm: newAlgorithm
				});

				return this.save().then(() => {
					return true;
				});
			}
			return Promise.resolve();
		}
		return Promise.reject();
	};

	OAuthClient.prototype.verifyRedirectUri = function(redirectUri) {
		if (!this.get("OAuthRedirectUris")) {
			console.log(
				"OAuthRedirectUris wasn't included in this instance of OAuthClient!"
			);

			return false;
		}

		let uris = this.get("OAuthRedirectUris").map(uri => {
			return uri.get("uri");
		});

		for (var i = 0; i < uris.length; i++) {
			if (uris[i] === redirectUri) {
				return true;
			}
		}

		return false;
	};

	OAuthClient.prototype.toJSON = function(options = {}) {
		let client = this.get();

		let json = pick(client, [
			"id",
			"name",
			"trusted",
			"createdAt",
			"updatedAt"
		]);

		//user id

		if (options.owner || options.admin) {
			json.userId = client.user_id;

			if (client.User) {
				json.user = client.User.toJSON(options);
			}

			//redirect uris
			json.redirectUris = [];

			if (Array.isArray(client.OAuthRedirectUris)) {
				client.OAuthRedirectUris.forEach(redirectUri => {
					json.redirectUris.push(redirectUri.get("uri"));
				});
			}
		}

		return json;
	};

	return OAuthClient;
};

module.exports = OAuthClient;
