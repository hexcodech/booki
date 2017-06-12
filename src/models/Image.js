const Image = ({
	folders,
	config,
	sequelize,
	errorController,
	models,
	cryptoUtilities
}) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	const path = require("path");
	const mkdirp = require("mkdirp-promise");
	const async = require("async");

	const sharp = require("sharp");
	const sizeOf = require("image-size");

	let Image = sequelize.define(
		"image",
		{
			width: {
				type: Sequelize.INTEGER
			},
			height: {
				type: Sequelize.INTEGER
			},
			mimeType: {
				type: Sequelize.STRING
			}
		},
		{
			defaultScope: {
				include: [
					{
						model: models.Thumbnail,
						as: "Thumbnails"
					},
					{
						model: models.File,
						as: "File"
					}
				]
			},

			classMethods: {
				associate: function({ User, File, Thumbnail }) {
					this.belongsTo(User, {
						as: "User",
						foreignKey: "user_id"
					});
					this.belongsTo(File, {
						as: "File",
						foreignKey: "file_id",
						onDelete: "cascade",
						hooks: true
					});
					this.hasMany(Thumbnail, {
						as: "Thumbnails",
						foreignKey: "image_id",
						onDelete: "cascade",
						hooks: true
					});
				},

				generatePath: function(id) {
					let d = new Date();

					return path.resolve(
						folders.uploads,
						d.getFullYear() + "",
						d.getMonth() + 1 + "",
						//prevent the use as public image hosting api
						cryptoUtilities.generateRandomString(3).replace(/\//g, "-"),
						id + ".png"
					);
				},

				store: function(imageData, user) {
					return models.File.create({}).then(fileInstance => {
						let dim = sizeOf(imageData),
							saveTo = this.generatePath(fileInstance.get("id"));

						fileInstance.set("path", saveTo);

						let image = models.Image.build({
							width: dim.width,
							height: dim.height,
							mimeType: "image/png",
							user_id: user.get("id"),
							file_id: fileInstance.get("id")
						});

						return mkdirp(path.dirname(saveTo))
							.then(() => {
								return sharp(imageData).toFile(saveTo);
							})
							.then(() => {
								return fileInstance.save();
							})
							.then(() => {
								return image.save();
							})
							.then(() => {
								return image.reload(); //include 'File'
							})
							.then(() => {
								return image.generateThumbnails();
							})
							.then(() => {
								return image.reload(); //include 'Thumbnails'
							})
							.catch(err => {
								return Promise.reject(
									new errorController.errors.InternalServerError({
										message: err.message
									})
								);
							});
					});
				}
			},
			instanceMethods: {
				cleanThumbnails: function() {
					let thumbnails = this.get("Thumbnails");

					return Promise.all(
						thumbnails.map(thumbnail => {
							return thumbnail.destroy();
						})
					);
				},
				getUrl: function() {
					return (
						"/static/uploads/" +
						this.get("File").get("path").split(folders.uploads)[1]
					);
				},
				getThumbnailsRaw: function(options) {
					let thumbnails = this.get("Thumbnails");

					return thumbnails.map(thumbnail => {
						return thumbnail.toJSON(options);
					});
				},

				generateThumbnails: function() {
					return new Promise((resolve, reject) => {
						models.ThumbnailType
							.findAll({})
							.then(thumbnailTypes => {
								async.each(
									thumbnailTypes,
									(thumbnailType, callback) => {
										models.File.create({}).then(file => {
											let p = this.get("File").get("path"),
												ext = path.extname(p),
												w = thumbnailType.get("width"),
												h = thumbnailType.get("height"),
												saveTo = path.resolve(
													path.dirname(p),
													path.basename(p, ext) +
														"-" +
														cryptoUtilities.generateRandomString(3) +
														"-" +
														w +
														"x" +
														h +
														ext
												);
											file.set({ path: saveTo });

											let thumbnail = models.Thumbnail.build({
												image_id: this.get("id"),
												file_id: file.get("id"),
												thumbnail_type_id: thumbnailType.get("id")
											});

											sharp(p)
												.resize(w, h)
												.toFile(saveTo)
												.then(() => {
													return file.save();
												})
												.then(() => {
													return thumbnail.save();
												})
												.then(() => {
													callback();
												})
												.catch(err => {
													file
														.destroy()
														.then(() => {
															callback(err);
														})
														.catch(err => {
															callback(err);
														});
												});
										});
									},
									err => {
										if (err) {
											return reject(err);
										}
										resolve();
									}
								);
							})
							.catch(err => {
								reject(err);
							});
					});
				},

				toJSON: function(options = {}) {
					let image = this.get();

					let json = pick(image, [
						"id",
						"width",
						"height",
						"mimeType",
						"createdAt",
						"updatedAt"
					]);

					json.userId = image.user_id;

					if (options.hiddenData) {
						if (image.File) {
							json.url = this.getUrl();
						}
						json.fileId = image.file_id;
					}

					if (image.Thumbnails) {
						json.thumbnails = image.Thumbnails.map(thumbnail => {
							return thumbnail.toJSON(options);
						});
					}

					return json;
				}
			},
			hooks: {
				beforeDestroy: image => {
					//thumbnails are cascade deleted, the file not
					return image.get("File").destroy();
				}
			}
		}
	);

	return Image;
};

module.exports = Image;
