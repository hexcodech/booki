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
					model   : models.User
				},
				{
					model   : models.Client
				}
			]
		},
	}, {
		classMethods: {
    	associate: function({User, OAuthClient}){
				this.belongsTo(User);
				this.belongsTo(OAuthClient);
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
