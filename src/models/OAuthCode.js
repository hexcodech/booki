const OAuthCode = ({
	booki,                config,        sequelize,
	generateRandomString, hash,          models
}) => {

	const Sequelize   = require('sequelize');

	let OAuthCode = sequelize.define('oauth_code', {
		hash: {
			type       : Sequelize.STRING,
		},
		expires: {
			type       : Sequelize.DATE,
		}
	}, {
		defaultScope: {
			include: [
				{
					model   : models.User,
					as      : 'User'
				},
				{
					model  : models.OAuthClient,
					as      : 'OAuthClient'
				}
			]
		},

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

			generateCode: function(){
				return generateRandomString(config.TOKEN_LENGTH);
			},

			hashCode: function(code = ''){
				return hash(code, false).hash;
			},

			findByCode: function(code = ''){
				return new Promise((reject, resolve) => {

					this.findOne({where: {hash: this.hashCode(code)}}).then((oauthCode) => {
						return resolve(oauthCode);

					}).catch((err) => {
						return reject(new this.errorController.errors.DatabaseError({
							message: err.message
						}));
					});

				});
			}
  	},

  	instanceMethods: {
    	toJSON: function(options){
				let code = this.get();

				let json = {
					id     : code.id,
					expires: code.expires
				};

				if(code.User){
					json.userId = code.User.toJSON();
				}

				if(code.Client){
					json.clientId = code.Client.get('id');
				}

				return json;
			}
		}
	});

	return OAuthCode;

}

module.exports = OAuthCode;
