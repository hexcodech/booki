const Image = ({config, sequelize, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	const path      = require('path');
	const sharp     = require('sharp');

	let Image = sequelize.define('image', {
		width: {
      type          : Sequelize.INTEGER
    },
    height: {
      type          : Sequelize.INTEGER
    },
    mimeType: {
      type          : Sequelize.STRING
    }
	}, {
    defaultScope: {
			include: [
				{
					model   : models.File,
					as      : 'File'
				}
			],
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
			generateThumbnails: function(){
				return new Promise((resolve, reject) => {

					models.File.create({}).then((file) => {
						return models.ThumbnailType.findAll({});
					}).then((thumbnailTypes) => {

						async.each(thumbnailTypes, (thumbnailType, callback) => {
							let path   = this.get('File').get('path'),
							    ext    = path.extname(path),
									w      = thumbnailType.get('width'),
									h      = thumbnailType.get('height'),
									saveTo = path.resolve(
										path.dirname(path),
										path.basename(path, ext) + '-' + w + 'x' + h + '.' + ext
									);

							let file      = models.File.build({path: saveTo});
							let thumbmail = models.Thumbnail.build({
								image_id          : this.get('id'),
								file_id           : file.get('id'),
								thumbnail_type_id : thumbnailType.get('id')
							});

							sharp(path)
							.resize(w, h)
							.toFile(saveTo).then(() => {
								return file.save();
							}).then(() => {
								return thumbnail.save();
							}).then(() => {
								callback();
							}).catch((err) => {
								callback(err);
							});
							
						}, (err) => {
							reject(err);
						});
					}).catch((err) => {
						reject(err);
					});
				});
			},

    	toJSON: function(options){
				let image = this.get();

				let json = pick(image, [
					'id', 'width', 'height', 'mimeType', 'createdAt', 'updatedAt'
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
