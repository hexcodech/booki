const PermissionRelation = ({sequelize, models: {Permission} }) => {

	const Sequelize = require('sequelize');

	let PermissionRelation = sequelize.define('permission_relation', {}, {
		defaultScope: {
			include: [
				{
					model : Permission
				}
			]
		},
		
		classMethods: {
    	associate: function({User, Permission}){
				this.belongsTo(User);
				this.belongsTo(Permission);
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let relation = this.get();

				let json = {id: relation.id};

				if(relation.Permission){
					json.permission = relation.Permission.toJSON(options);
				}

				if(relation.User){
					json.userId = relation.User.get('id');
				}

				return json;
			}
		}
	});

	return PermissionRelation;
};

module.exports = PermissionRelation;
