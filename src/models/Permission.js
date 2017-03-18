const Permission = ({sequelize}) => {

	const Sequelize = require('sequelize');

	let Permission = sequelize.define('permission', {
		permission: {
			type   : Sequelize.STRING,
			unique : true
		}
	}, {
		classMethods: {
    	associate: function({User}){
				this.belongsToMany(User, {
					as         : 'Permission',
					foreignKey : 'permission_id',
					otherKey   : 'user_id',
					through    : 'permission_relations',
					onDelete   : 'cascade',
					hooks      : true,
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
