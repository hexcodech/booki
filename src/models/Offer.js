const Offer = ({ sequelize, models }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	let Offer = sequelize.define(
		"offer",
		{
			description: {
				type: Sequelize.STRING(2000),
				default: ""
			},
			price: {
				type: Sequelize.FLOAT
			},
			sold: {
				type: Sequelize.BOOLEAN,
				default: false
			}
		},
		{
			charset: "utf8",
			collate: "utf8_unicode_ci",
			defaultScope: {
				/*include: [
					{
						model: models.User,
						as: "User"
					},
					{
						model: models.Condition,
						as: "Condition"
					}
				]*/
			}
		}
	);

	Offer.associate = function({ Book, User, Condition }) {
		this.belongsTo(Book, {
			as: "Book",
			foreignKey: "book_id"
		});
		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.belongsTo(Condition, {
			as: "Condition",
			foreignKey: "condition_id"
		});
	};

	Offer.prototype.toJSON = function(options = {}) {
		let offer = this.get(); //invoking virtual getters

		let json = pick(offer, [
			"id",
			"description",
			"price",
			"sold",
			"createdAt",
			"updatedAt"
		]);

		json.bookId = offer.book_id;

		if (offer.Book) {
			json.book = offer.Book.toJSON(options);
		}

		json.userId = offer.user_id;

		if (offer.User) {
			json.user = offer.User.toJSON(options);
		}

		json.conditionId = offer.condition_id;

		if (offer.Condition) {
			json.condition = offer.Condition.toJSON(options);
		}

		return json;
	};

	return Offer;
};

module.exports = Offer;
