const Person = ({ sequelize, sphinx, models }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	const sphinxUtils = require("../utilities/SphinxUtilities");

	let Person = sequelize.define(
		"person",
		{
			nameTitle: {
				type: Sequelize.STRING
			},
			nameFirst: {
				type: Sequelize.STRING
			},
			nameMiddle: {
				type: Sequelize.STRING
			},
			nameLast: {
				type: Sequelize.STRING
			},

			verified: {
				type: Sequelize.BOOLEAN,
				default: false
			}
		},
		{
			getterMethods: {
				name: function() {
					return ((this.nameTitle ? this.nameTitle + " " : "") +
						(this.nameFirst ? this.nameFirst + " " : "") +
						(this.nameMiddle ? this.nameMiddle + " " : "") +
						(this.nameLast ? this.nameLast : "")).trim();
				}
			},
			classMethods: {
				associate: function({ Book }) {
					this.belongsToMany(Book, {
						as: "Books",
						foreignKey: "author_id",
						otherKey: "book_id",
						through: "author_relations"
					});
				},

				searchByExactName: function(name) {
					return sphinx
						.query("SELECT * FROM people WHERE MATCH(?)", [
							"@name '" + sphinxUtils.escape(name) + "'"
						])
						.then(results => {
							return results;
						});
				},

				lookupByName: function(name) {
					return sphinx
						.query("SELECT * FROM people WHERE MATCH(?)", [
							"@name *" + sphinxUtils.escape(name) + "*"
						])
						.then(results => {
							return results;
						});
				}
			},
			instanceMethods: {
				toJSON: function(options) {
					let person = this.get();

					let json = pick(person, [
						"id",
						"name",
						"nameTitle",
						"nameFirst",
						"nameMiddle",
						"nameLast",
						"verified",
						"createdAt",
						"updatedAt"
					]);

					return json;
				}
			}
		}
	);

	return Person;
};

module.exports = Person;
