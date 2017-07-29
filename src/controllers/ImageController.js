class ImageController {
	constructor({ booki, config, models, folders, cryptoUtilities }) {
		this.path = require("path");
		this.mkdirp = require("mkdirp-promise");

		this.Busboy = require("busboy");
		this.sharp = require("sharp");
		this.sizeOf = require("image-size");

		this.CryptoUtilities = cryptoUtilities;

		this.config = config;
		this.folders = folders;

		this.models = models;

		["getImage", "postImage", "putImage", "deleteImage"].forEach(key => {
			this[key] = this[key].bind(this);
		});
	}

	getImage(request, response, next) {
		this.models.Image
			.findAll({
				include: [
					{
						model: this.models.Thumbnail,
						as: "Thumbnails"
					},
					{
						model: this.models.File,
						as: "File"
					}
				]
			})
			.then(images => {
				if (request.hasPermission("admin.offer.read")) {
					response.json(
						images.map(image => {
							return image.toJSON({ admin: true });
						})
					);
				} else {
					response.json(
						images.map(image => {
							return image.toJSON();
						})
					);
				}
				return response.end();
			})
			.catch(next);
	}

	postImage(request, response, next) {
		try {
			let busboy = new this.Busboy({ headers: request.headers });
			busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
				if (!mimetype.startsWith("image/")) {
					return next(new Error("The file isn't an image!"));
				}

				let data = Buffer.from([]);

				file.on("data", newData => {
					data = Buffer.concat([data, newData]);

					if (data.length > this.config.MAX_UPLOAD_FILE_SIZE) {
						return next(new Error("The file exceeds the max upload limit!"));
					}
				});

				file.on("end", () => {
					//double check
					if (
						mimetype.startsWith("image/") &&
						data.length <= this.config.MAX_UPLOAD_FILE_SIZE
					) {
						this.models.Image
							.store(data, request.user)
							.then(image => {
								if (request.hasPermission("admin.image.read")) {
									response.json(image.toJSON({ admin: true }));
								} else {
									response.json(image.toJSON());
								}
								response.end();
							})
							.catch(next);
					} else {
						return next(
							new Error(
								"Either the file isn't an image or it exceeds the max upload limit!"
							)
						);
					}
				});
			});

			request.pipe(busboy);
		} catch (err) {
			return next(err);
		}
	}

	putImage(request, response, next) {
		this.models.Image
			.findOne({ where: { id: request.params.imageId } })
			.then(image => {
				if (!image) {
					return Promise.reject(new Error("This image wasn't found!"));
				}

				if (
					request.hasPermission("admin.image.editOthers") ||
					image.get("user_id") === request.user.get("id")
				) {
					try {
						let busboy = new this.Busboy({ headers: request.headers });
						busboy.on(
							"file",
							(fieldname, file, filename, encoding, mimetype) => {
								let buffers = [];

								file.on("data", data => {
									buffers.push(data);
								});

								file.on("end", () => {
									let data = Buffer.concat(buffers);

									if (
										mimetype.startsWith("image/") &&
										file.byteLength <= this.config.MAX_UPLOAD_FILE_SIZE
									) {
										//TODO delete old file
										this.models.Image
											.store(data, request.user)
											.then(image => {
												if (request.hasPermission("admin.image.read")) {
													response.json(image.toJSON({ admin: true }));
												} else {
													response.json(image.toJSON());
												}
												response.end();
											})
											.catch(next);
									} else {
										return next(
											new Error(
												"Either the file isn't an image or it exceeds the max upload limit!"
											)
										);
									}
								});
							}
						);

						request.pipe(busboy);
					} catch (err) {
						return next(err);
					}
				} else {
					return Promise.reject(
						new Error("You are not allowed to update this image!")
					);
				}
			})
			.catch(next);
	}

	deleteImage(request, response, next) {
		this.models.Image
			.findOne({ where: { id: request.params.imageId } })
			.then(image => {
				if (
					image &&
					(request.hasPermission("admin.image.deleteOthers") ||
						image.get("user_id") === request.user.get("id"))
				) {
					return image
						.destroy()
						.then(() => {
							response.json({ success: true });
							response.end();
						})
						.catch(next);
				} else {
					return Promise.reject(
						new Error("You are not allowed to delete this image!")
					);
				}
			})
			.catch(next);
	}
}

module.exports = ImageController;
