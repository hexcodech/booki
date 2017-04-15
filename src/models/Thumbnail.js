const Thumbnail = ({config, sequelize, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let Thumbnail = sequelize.define('thumbnail', {},{
    defaultScope: {
      include: [
        {
          model : models.ThumbnailType,
					as    : 'ThumbnailType'
        }
      ]
    },

		classMethods: {
    	associate: function({File, Image, ThumbnailType}){
				this.belongsTo(File, {
					as         : 'File',
					foreignKey : 'file_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.belongsTo(Image, {
					as         : 'Image',
					foreignKey : 'image_id',
					onDelete   : 'cascade',
					hooks      : true
				});
		    this.belongsTo(ThumbnailType, {
					as         : 'ThumbnailType',
					foreignKey : 'thumbnail_type_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let thumbnail = this.get();

				let json = pick(thumbnail, [
					'id', 'width', 'height', 'mimeType', 'createdAt', 'updatedAt'
				]);

				if(thumbnail.ThumbnailType){
					json.thumbnailType = thumbnail.ThumbnailType.toJSON(options);
				}

				return json;
			}
		}
	});

	return Thumbnail;
};



module.exports = Thumbnail;
