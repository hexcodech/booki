const Permission = ({sequelize}) => {

	const Sequelize = require('sequelize');

	let Permission = sequelize.define('permission', {
		permission: {
			type   : Sequelize.STRING,
			unique : true
		}
	}, {
		classMethods: {
    	associate: function({PermissionRelation}){
				this.hasMany(PermissionRelation, {
					onDelete : 'cascade',
					hooks    : true
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				return {id: this.get('id'), permission: this.get('permission')};
			}
		}
	});

	return Permission;
};

module.exports = Permission;
