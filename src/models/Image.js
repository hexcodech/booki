const Image = ({config, sequelize, errorController, models}) => {

	const pick      = require('lodash/pick');
	const Sequelize = require('sequelize');

	const path      = require('path');
	const async     = require('async');
	//const fs        = require('fs');
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
					model   : models.Thumbnail,
					as      : 'Thumbnails'
				},
				{
					model   : models.File,
					as      : 'File'
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
			cleanThumbnails: function(){
				let thumbnails = this.get('Thumbnails');

				return Promise.all(thumbnails.map((thumbnail) => {
					return thumbnail.destroy();
				}));
			},

			/*cleanThumbnailsHard: function(){

				let path         = this.get('File').get('path'),
				    thumbnailDir = path.dirname(path),
				    ext          = path.extname(path),
						name         = path.basename(path, ext);

				return new Promise((resolve, reject) => {
					fs.readdir(thumbnailDir, (err, files) => {
							if(err){
								return reject(err);
							}

							async.each(files, (file, callback) => {
								if(file.startsWith(name) + '-'){

									fs.unlink(path.resolve(
										thumbnailDir,
										file
									), callback);

								}else{
									callback();
								}

							}, (err) => {
								if(err){
									return reject(err);
								}

								resolve();
							});
						});
				}).then(() => {
					let thumbnails = this.get('Thumbnails');

					return Promise.all(thumbnails.map((thumbnail) => {
						return thumbnail.destroy();
					}));
				});
			},*/
			generateThumbnails: function(){
				return new Promise((resolve, reject) => {

					return models.File.create({}).then((file) => {
						models.ThumbnailType.findAll({}).then((thumbnailTypes) => {
							async.each(thumbnailTypes, (thumbnailType, callback) => {

								let p      = this.get('File').get('path'),
								    ext    = path.extname(p),
										w      = thumbnailType.get('width'),
										h      = thumbnailType.get('height'),
										saveTo = path.resolve(
											path.dirname(p),
											path.basename(p, ext) + '-' + w + 'x' + h + ext
										);
								file.set({path: saveTo});

								let thumbnail = models.Thumbnail.build({
									image_id          : this.get('id'),
									file_id           : file.get('id'),
									thumbnail_type_id : thumbnailType.get('id')
								});

								sharp(p)
								.resize(w, h)
								.toFile(saveTo).then(() => {
									return file.save();
								}).then(() => {
									return thumbnail.save();
								}).then(() => {
									callback();
								}).catch((err) => {
									file.destroy().then(() => {
										callback(err);
									}).catch((err) => {
										callback(err);
									});
								});

							}, (err) => {
								if(err){
									return reject(err);
								}
								resolve();
							});
						}).catch((err) => {
							reject(err);
						});
					});
				});
			},

    	toJSON: function(options){
				let image = this.get();

				let json = pick(image, [
					'id', 'width', 'height', 'mimeType', 'createdAt', 'updatedAt'
				]);

				//generateUrl
				/*if(image.File){
					json.url = '/static/' + image.File.get('path').split('/static/')[1];
				}*/

				if(image.Thumbnails){
					json.thumbnails = image.Thumbnails.map((thumbnail) => {
						return thumbnail.toJSON(options);
					});
				}

				return json;
			}
		},
		hooks: {
			beforeDestroy: (image) => {
				//thumbnails are cascade deleted, the file not
				return image.get('File').destroy();
			}
		}
	});

	return Image;
};



module.exports = Image;
