const columnName = "email";
const tableName = "offer_requests";

module.exports = {
	up: (queryInterface, Sequelize) => {
		queryInterface.addColumn(tableName, columnName, {
			type: Sequelize.STRING,
			allowNull: true
		});
	},

	down: (queryInterface, Sequelize) => {
		queryInterface.removeColumn(tableName, columnName);
	}
};
