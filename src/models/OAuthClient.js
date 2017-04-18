const OAuthClient = ({config, sequelize, models, cryptoUtilities}) => {

	const pick            = require('lodash/pick');
	const Sequelize       = require('sequelize');
	const CryptoUtilities = cryptoUtilities;

	let OAuthClient       = sequelize.define('oauth_client', {

		/* Name */
			name: {
				type        : Sequelize.STRING
			},

		/* Secret */

			secretHash: {
				type        : Sequelize.STRING
			},

			secretSalt: {
				type        : Sequelize.STRING
			},

			secretAlgorithm: {
				type        : Sequelize.STRING
			},

		/* Trusted */

			trusted: {
				type        : Sequelize.BOOLEAN,
				default     : false
			}
	}, {
		defaultScope: {
			include: [
				{
					model     : models.User,
					as        : 'User',
				},
				{
					model     : models.OAuthRedirectUri,
					as        : 'OAuthRedirectUris',
				}
			]
		},

		classMethods: {

    	associate: function({
				User, OAuthCode, OAuthAccessToken, OAuthRedirectUri
			}){
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.hasMany(OAuthCode, {
					as         : 'OAuthCodes',
					foreignKey : 'oauth_client_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.hasMany(OAuthAccessToken, {
					as         : 'OAuthAccessTokens',
					foreignKey : 'oauth_client_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.hasMany(OAuthRedirectUri, {
					as         : 'OAuthRedirectUris',
					foreignKey : 'oauth_client_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			},

			generateSecret: function(){
				return CryptoUtilities.generateRandomString(
					config.CLIENT_SECRET_LENGTH
				);
			},

  	},
  	instanceMethods: {

			setSecret: function(secret){
				let {hash, salt, algorithm} = CryptoUtilities.generateHash(secret);

				this.set({
					secretHash      : hash,
					secretSalt      : salt,
					secretAlgorithm	: algorithm
				});
			},

			verifySecret: function(secret){
				let {hash} = CryptoUtilities.generateHash(
					secret,
					this.get('secretSalt'),
					this.get('secretAlgorithm')
				);

				let {
					hash      : newHash,
					algorithm : newAlgorithm
				}	= CryptoUtilities.generateHash(secret, this.get('secretSalt'));

				if(this.get('secretHash') && hash === this.get('secretHash')){

					if(this.get('secretAlgorithm') !== newAlgorithm){

						//if the algorithm changed, update the hash
						this.set({
							secretHash      : newHash,
							secretSalt      : salt,
							secretAlgorithm : newAlgorithm
						});

						return this.save().then(() => {
							return true;
						});

					}
					return Promise.resolve();
				}
				return Promise.reject();
			},

			verifyRedirectUri: function(redirectUri){

				let uris = this.get('OAuthRedirectUris').map((uri) => {
					return uri.get('uri');
				});

				for(var i=0;i<uris.length;i++){
					if(uris[i] === redirectUri){
						return true;
					}
				}

				return false;
			},

    	toJSON: function(options = {hiddenData: false}){
				let client = this.get();

				let json = pick(client, [
					'id', 'name', 'trusted', 'createdAt', 'updatedAt'
				]);

				//user id

				if(options.hiddenData && client.User){
					json.userId	= client.User.get('id');
				}

				//redirect uris
		    json.redirectUris = [];

				if(Array.isArray(client.OAuthRedirectUris)){
					client.OAuthRedirectUris.forEach((redirectUri) => {
						json.redirectUris.push(redirectUri.get('uri'));
					});
				}

				return json;
			}
		}
	});


	return OAuthClient;

}

module.exports = OAuthClient;
