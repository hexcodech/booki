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
			charset: "utf8",
			collate: "utf8_unicode_ci",
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
		return sequelize.query(
			"SELECT * FROM people WHERE CONCAT_WS(' ', people.nameTitle, people.nameFirst, people.nameMiddle, people.nameLast) = $name",
			{
				bind: { name: name },
				type: sequelize.QueryTypes.SELECT,
				model: this
			}
		);
	};

	Person.lookupByName = function(name) {
		return sequelize.query(
			"SELECT * FROM people WHERE MATCH(people.nameTitle, people.nameFirst, people.nameMiddle, people.nameLast) AGAINST ($name IN BOOLEAN MODE)",
			{
				bind: { name: "*" + name.replace(/[^\wÀ-ž\s]/g, " ") + "*" },
				type: sequelize.QueryTypes.SELECT,
				model: this
			}
		);
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
