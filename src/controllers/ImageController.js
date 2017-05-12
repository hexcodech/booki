class ImageController {
	constructor({
		booki,
		config,
		models,
		errorController,
		folders,
		cryptoUtilities
	}) {
		const bindAll = require("lodash/bindAll");

		this.path = require("path");
		this.mkdirp = require("mkdirp-promise");

		this.Busboy = require("busboy");
		this.sharp = require("sharp");
		this.sizeOf = require("image-size");

		this.CryptoUtilities = cryptoUtilities;

		this.config = config;
		this.folders = folders;
		this.errorController = errorController;

		this.File = models.File;
		this.Image = models.Image;

		bindAll(this, ["getImage", "postImage", "putImage", "deleteImage"]);
	}

	getImage(request, response, next) {
		this.Image
			.findAll()
			.then(images => {
				if (images) {
					if (request.hasPermission("admin.offer.hiddenData.read")) {
						response.json(
							images.map(image => {
								return image.toJSON({ hiddenData: true });
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
				}

				return next(
					new this.errorController.errors.UnexpectedQueryResultError()
				);
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	postImage(request, response, next) {
		try {
			let busboy = new this.Busboy({ headers: request.headers });
			busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
				console.log(mimetype);

				if (!mimetype.startsWith("image/")) {
					return next(new this.errorController.errors.InvalidImageError());
				}

				let data = Buffer.from([]);

				file.on("data", newData => {
					data = Buffer.concat([data, newData]);

					if (data.length > this.config.MAX_UPLOAD_FILE_SIZE) {
						return next(new this.errorController.errors.InvalidImageError());
					}
				});

				file.on("end", () => {
					//double check
					if (
						mimetype.startsWith("image/") &&
						data.length <= this.config.MAX_UPLOAD_FILE_SIZE
					) {
						this.Image
							.store(data, request.user)
							.then(image => {
								if (request.hasPermission("admin.image.hiddenData.read")) {
									response.json(image.toJSON({ hiddenData: true }));
								} else {
									response.json(image.toJSON());
								}
								response.end();
							})
							.catch(error => {
								return next(error);
							});
					} else {
						return next(new this.errorController.errors.InvalidImageError());
					}
				});
			});

			request.pipe(busboy);
		} catch (err) {
			return next(
				new this.errorController.errors.BadRequestError({
					message: err.message
				})
			);
		}
	}

	putImage(request, response, next) {
		this.Image
			.findOne({ where: { id: request.params.imageId } })
			.then(image => {
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
										this.Image
											.store(data, request.user)
											.then(image => {
												if (
													request.hasPermission("admin.image.hiddenData.read")
												) {
													response.json(image.toJSON({ hiddenData: true }));
												} else {
													response.json(image.toJSON());
												}
												response.end();
											})
											.catch(error => {
												return next(error);
											});
									} else {
										return next(
											new this.errorController.errors.InvalidImageError()
										);
									}
								});
							}
						);

						request.pipe(busboy);
					} catch (err) {
						return next(new this.errorController.errors.BadRequestError());
					}
				} else {
					return next(new this.errorController.errors.ForbiddenError());
				}
			})
			.catch(err => {
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}

	deleteImage(request, response, next) {
		this.Image
			.findOne({ where: { id: request.params.imageId } })
			.then(image => {
				if (
					image &&
					(request.hasPermission("admin.image.deleteOthers") ||
						image.get("user_id") === request.user.get("id"))
				) {
					image
						.destroy()
						.then(() => {
							response.json({ success: true });
							response.end();
						})
						.catch(err => {
							return next(
								new this.errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});
				} else {
					return next(new this.errorController.errors.ForbiddenError());
				}
			})
			.catch(err => {
				console.log(err);
				return next(
					new this.errorController.errors.DatabaseError({
						message: err.message
					})
				);
			});
	}
}

module.exports = ImageController;
