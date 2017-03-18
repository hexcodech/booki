const Condition = ({sequelize, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let Condition = sequelize.define('condition', {
		key: {
      type          : Sequelize.STRING
		},
    priceFactor:{
      type          : Sequelize.FLOAT
    }
	}, {
		classMethods: {
    	associate: function({Offer}){
				this.hasMany(Offer, {
					as         : 'Offers',
					foreignKey : 'condition_id',
		      onDelete   : 'cascade',
		      hooks      : true
		    });
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let condition = this.get();

				let json = pick(condition, [
					'key', 'priceFactor'
				]);

				return json;
			}
		}
	});

	return Condition;
};



module.exports = Condition;
