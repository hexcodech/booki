const Thumbnail = ({sequelize, config, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let Thumbnail = sequelize.define('thumbnail', {
		url: {
      type          : Sequelize.STRING,
      default       : config.DEFAULT_BOOK_COVER,
      validate      : {
        isUrl         : true
      }
		},
    width: {
      type          : Sequelize.INTEGER
    },
    height: {
      type          : Sequelize.INTEGER
    },
    format: {
      type          : Sequelize.STRING
    }
	},{
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
					foreignKey : 'image_id'
				});
		    this.belongsTo(ThumbnailType, {
					as         : 'ThumbnailType',
					foreignKey : 'thumbnail_type_id'
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let thumbnail = this.get();

				let json = pick(thumbnail, [
					'id', 'url', 'width', 'height', 'format', 'createdAt', 'updatedAt'
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
