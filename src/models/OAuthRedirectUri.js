const OAuthRedirectUri = ({ sequelize }) => {
	const Sequelize = require("sequelize");

	let OAuthRedirectUri = sequelize.define("oauth_redirect_uri", {
		uri: {
			type: Sequelize.STRING
		}
	});

	OAuthRedirectUri.associate = function({ OAuthClient }) {
		this.belongsTo(OAuthClient, {
			as: "OAuthClient",
			foreignKey: "oauth_client_id"
		});
	};

	OAuthRedirectUri.toJSON = function(options = {}) {
		return { id: this.get("id"), uri: this.get("uri") };
	};

	return OAuthRedirectUri;
};

module.exports = OAuthRedirectUri;
