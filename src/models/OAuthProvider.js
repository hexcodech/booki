const OAuthProvider = ({sequelize}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let OAuthProvider = sequelize.define('oauth_provider', {
		type: {
			type         : Sequelize.ENUM,
			values       : ['googe', 'facebook']
		},
		accessToken: {
			type         : Sequelize.STRING
		},
		refreshToken: {
			type         : Sequelize.STRING
		}
	}, {
		classMethods: {
    	associate: function({User}){
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let provider = this.get();

				let json = pick(provider, [
					'id', 'type', 'createdAt', 'updatedAt'
				]);

				if(hiddenData){
					json.accessToken  = provider.accessToken;
					json.refreshToken = provider.refreshToken;
				}

				return json;
			}
		}
	});

	return OAuthProvider;
};



module.exports = OAuthProvider;
