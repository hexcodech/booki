const ThumbnailType = ({sequelize}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let ThumbnailType = sequelize.define('thumbnail_type', {
		name: {
      type: Sequelize.STRING
    },
		width: {
      type: Sequelize.INTEGER
    },
    height: {
      type: Sequelize.INTEGER
    }
	}, {
		classMethods: {
    	associate: function({Thumbnail}){
				this.hasMany(Thumbnail, {
					as         : 'Thumbnails',
					foreignKey : 'thumbnail_type_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let type = this.get();

				let json = pick(type, [
					'id', 'name'
				]);

				return json;
			}
		}
	});

	return ThumbnailType;
};



module.exports = ThumbnailType;
