const Offer = ({sequelize, models}) => {

	const pick       = require('lodash/pick');
	const Sequelize  = require('sequelize');

	let Offer = sequelize.define('offer', {
		description: {
			type: Sequelize.STRING(2000),
			default: ''
		},
		price: {
			type: Sequelize.FLOAT,
		},
		sold: {
			type: Sequelize.BOOLEAN,
			default: false
		},
	}, {
		defaultScope: {
			include: [
				{
					model    : models.User,
					as       : 'User'
				},
				{
					model    : models.Book,
					as       : 'Book'
				},
				{
					model    : models.Condition,
					as       : 'Condition'
				}
			]
		},

		classMethods: {
    	associate: function({Book, User, Condition}){
				this.belongsTo(Book, {
					as         : 'Book',
					foreignKey : 'book_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.belongsTo(Condition, {
					as         : 'Condition',
					foreignKey : 'condition_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let offer = this.get(); //invoking virtual getters

				let json = pick(offer, [
					'id', 'description', 'price', 'createdAt', 'updatedAt'
				]);

				json.userId = offer.user_id;
				json.bookId = offer.book_id;

				if(offer.Condition){
					json.condition = offer.Condition.toJSON(options);
				}

				return json;
			}
		}
	});

	return Offer;
};

module.exports = Offer;
