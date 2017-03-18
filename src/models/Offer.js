const Offer = ({sequelize, models}) => {

	const pick       = require('lodash/pick');
	const Sequelize  = require('sequelize');

	let Offer = sequelize.define('offer', {
		description: {
			type: Sequelize.STRING,
		},
		price: {
			type: Sequelize.FLOAT,
		},
	}, {
		defaultScope: {
			include: [
				{
					model    : models.Condition,
					as      : 'Condition'
				}
			]
		},

		classMethods: {
    	associate: function({Book, User, Condition}){
				this.belongsTo(Book, {
					as         : 'Book',
					foreignKey : 'book_id'
				});
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id'
				});
				this.belongsTo(Condition, {
					as         : 'Condition',
					foreignKey : 'condition_id'
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let offer = this.get(); //invoking virtual getters

				let json = pick(offer, [
					'description', 'price', 'createdAt', 'updatedAt'
				]);

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
