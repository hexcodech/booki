const Person = ({ sequelize, models }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

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
			indexes: [
				{
					type: "FULLTEXT",
					name: "people_fulltext_idx",
					fields: ["nameTitle", "nameFirst", "nameMiddle", "nameLast"]
				}
			],

			getterMethods: {
				name: function() {
					return ((this.nameTitle ? this.nameTitle + " " : "") +
						(this.nameFirst ? this.nameFirst + " " : "") +
						(this.nameMiddle ? this.nameMiddle + " " : "") +
						(this.nameLast ? this.nameLast : "")).trim();
				}
			}
		}
	);

	Person.associate = function({ Book }) {
		this.belongsToMany(Book, {
			as: "Books",
			foreignKey: "author_id",
			otherKey: "book_id",
			through: "author_relations"
		});
	};

	Person.searchByExactName = function(name) {
		return this.findAll({
			where: [
				'CONCAT_WS(" ", nameTitle, nameFirst, nameMiddle, nameLast) = ?',
				[name]
			]
		});
	};

	Person.lookupByName = function(name) {
		name = "*" + name.replace(/[^A-z0-9\s]/g, "\\$&") + "*";

		return this.findAll({
			where: [
				"MATCH(nameTitle, nameFirst, nameMiddle, nameLast) AGAINST (? IN BOOLEAN MODE)",
				[name]
			]
		});
	};

	Person.toJSON = function(options = {}) {
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
	};

	return Person;
};

module.exports = Person;
