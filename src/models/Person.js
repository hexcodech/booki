const Person = ({sequelize, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let Person = sequelize.define('person', {
		nameTitle: {
      type          : Sequelize.STRING
		},
    nameFirst: {
      type          : Sequelize.STRING
		},
    nameMiddle: {
      type          : Sequelize.STRING
		},
    nameLast: {
      type          : Sequelize.STRING
		},

	}, {
    getterMethods   : {
      name : function(){
        return (
          (this.nameTitle   ? this.nameTitle   + ' ' : '') +
          (this.nameFirst   ? this.nameFirst   + ' ' : '') +
          (this.nameMiddle  ? this.nameMiddle  + ' ' : '') +
          (this.nameLast    ? this.nameLast          : '')
        ).trim();
      }
    },
		classMethods: {
    	associate: function({Book}){

				this.belongsToMany(Book, {
					as         : 'Books',
					foreignKey : 'author_id',
					otherKey   : 'book_id',
					through    : 'author_relations'
				});

			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let person = this.get();

				let json = pick(file, [
					'id', 'name', 'createdAt', 'updatedAt'
				]);

				return json;
			}
		}
	});

	return Person;
};



module.exports = Person;
