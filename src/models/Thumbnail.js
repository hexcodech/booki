const Thumbnail = ({config, sequelize, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let Thumbnail = sequelize.define('thumbnail', {},{
    defaultScope: {
      include: [
        {
          model : models.ThumbnailType,
					as    : 'ThumbnailType'
        },
				{
          model : models.File,
					as    : 'File'
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
			getUrl: function(){
				return '/static/' + this.get('File').get('path').split('/static/')[1];
			},
    	toJSON: function(options){
				let thumbnail = this.get();

				let json = pick(thumbnail, [
					'id', 'createdAt', 'updatedAt'
				]);

				if(thumbnail.File){
					json.url = this.getUrl();
				}

				if(thumbnail.ThumbnailType){
					Object.assign(json, pick(thumbnail.ThumbnailType.toJSON(options), [
						'name', 'width', 'height'
					]));
				}

				return json;
			}
		},

		hooks: {
			beforeDestroy: (thumbnail) => {
				return thumbnail.get('File').destroy();
			}
		}
	});

	return Thumbnail;
};



module.exports = Thumbnail;
