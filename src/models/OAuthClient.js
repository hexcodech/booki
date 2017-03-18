const OAuthClient = ({
	booki,            config,                 sequelize,
	errorController,  generateRandomString,   i18n,
	hash,             models
}) => {

	const pick      = require('lodash/pick');
	const Sequelize   = require('sequelize');

	let OAuthClient   = sequelize.define('oauth_client', {

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
				type        : Sequelize.BOOLEAN
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
				this.belongsTo(User);

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
				return generateRandomString(config.CLIENT_SECRET_LENGTH);
			},

  	},
  	instanceMethods: {

			setSecret: function(secret){
				let {hash, salt, algorithm} = hash(secret);

				this.set({
					secretHash      : hash,
					secretSalt      : salt,
					secretAlgorithm	: algorithm
				});
			},

			verifySecret: function(secret){
				return new Promise((reject, resolve) => {

					let {hash} = this.constructor.hash(
						secret,
						this.get('secretSalt'),
						this.get('secretAlgorithm')
					);
					let {hash : newHash, algorithm: newAlgorithm}	= this.constructor.hash(
						secret,
						this.get('secretSalt')
					);

					if(this.get('secretHash') && hash === this.get('secretHash')){

						if(this.get('secretAlgorithm') !== newAlgorithm){

							//if the algorithm changed, update the hash
							this.set({
								secretHash      : newHash,
								secretSalt      : salt,
								secretAlgorithm : newAlgorithm
							});

							return this.save((err, client) => {

								if(err){

									return reject(
										new this.constructor.errorController.errors.DatabaseError({
											message: err.message
										})
									);
								}
								return resolve();
							});
						}
						return resolve();
					}
					return reject();
				});
			},

			verifyRedirectUri: function(redirectUri){
				let uris = this.get('RedirectUris');

				for(var i=0;i<this.uris.length;i++){
					if(uris[i] === redirectUri){
						return true;
					}
				}

				return false;
			},

    	toJSON: function(options){
				let client = this.get();

				let json = pick(client, [
					'id', 'name', 'trusted', 'createdAt', 'updatedAt'
				]);

				//user id

				if(client.user){
					json.user	= client.User.toJSON(options);
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
