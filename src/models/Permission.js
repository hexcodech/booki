const Permission = ({ sequelize }) => {
	const Sequelize = require("sequelize");

	let Permission = sequelize.define("permission", {
		permission: {
			type: Sequelize.STRING,
			unique: true
		}
	});

	Permission.associate = function({ User }) {
		this.belongsToMany(User, {
			as: "Users",
			foreignKey: "permission_id",
			otherKey: "user_id",
			through: "permission_relations"
		});
	};

	Permission.prototype.toJSON = function(options = {}) {
		return { id: this.get("id"), permission: this.get("permission") };
	};

	return Permission;
};

module.exports = Permission;
