const Image = ({sequelize, config, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	let Image = sequelize.define('image', {
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
	}, {
    defaultScope: {
			include: [
				{
					model   : models.Thumbnail,
					as      : 'Thumbnails'
				}
			]
		},

		classMethods: {
    	associate: function({User, File, Thumbnail}){
				this.belongsTo(User, {
					as         : 'User',
					foreignKey : 'user_id',
					onDelete   : 'cascade',
					hooks      : true
				});
				this.belongsTo(File, {
					as         : 'File',
					foreignKey : 'file_id',
					onDelete   : 'cascade',
					hooks      : true
				});
		    this.hasMany(Thumbnail, {
					as         : 'Thumbnails',
					foreignKey : 'image_id',
					onDelete   : 'cascade',
					hooks      : true
				});
			}
  	},
  	instanceMethods: {
    	toJSON: function(options){
				let image = this.get();

				let json = pick(image, [
					'id', 'url', 'width', 'height', 'format', 'createdAt', 'updatedAt'
				]);

				if(image.Thumbnails){
					json.thumbnails = image.Thumbnails.map((thumbnail) => {
						return thumbnail.toJSON(options);
					});
				}

				return json;
			}
		}
	});

	return Image;
};



module.exports = Image;
