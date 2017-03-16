const File = ({sequelize, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let File = sequelize.define('file', {
		path: {
      type          : Sequelize.STRING
		}
	}, {
		classMethods: {
    	associate: function({}){

			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let file = this.get();

				let json = pick(file, [
					'id', 'path', 'createdAt', 'updatedAt'
				]);

				return json;
			}
		}
	});

	return File;
};



module.exports = File;
