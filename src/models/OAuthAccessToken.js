const OAuthAccessToken = ({
	booki,                  config,     sequelize,
	generateRandomString,   hash,       models
}) => {

	const Sequelize   = require('sequelize');

	let OAuthAccessToken = sequelize.define('oauth_access_token', {
		hash: {
			type        : Sequelize.STRING,
		},
		expires: {
			type        : Sequelize.DATE,
		}
	}, {
		defaultScope: {
			include: [
				{
					model   : models.User,
					as      : 'User'
				},
				{
					model   : models.Client,
					as      : 'OAuthClient'
				}
			]
		},
	}, {
		classMethods: {
    	associate: function({User, OAuthClient}){
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id'
				});
				this.belongsTo(OAuthClient, {
					as         : 'OAuthClient',
					foreignKey : 'oauth_client_id'
				});
			},
			generateToken: function(){
				return generateRandomString(config.TOKEN_LENGTH);
			},
			hashToken: function(token){
				return hash(token, false).hash;
			},
			findByToken: function(){
				return this.findOne({where: {hash: this.hashToken(token)}});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let token = this.get();

				let json = {
					id      : token.id,
					expires : token.expires
				};

				if(token.User){
					json.user = token.User.toJSON(options);
				}

				if(token.Client){
					json.clientId = token.Client.get('id');
				}

				return json;
			}
		}
	});


	return OAuthAccessToken;

}

module.exports = OAuthAccessToken;
