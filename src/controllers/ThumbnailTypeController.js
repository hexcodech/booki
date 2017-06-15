class ThumbnailTypeController {
	constructor({ booki, models, errorController }) {
		const bindAll = require("lodash/bindAll");
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.errorController = errorController;

		this.models = models;

		bindAll(this, [
			"getThumbnailType",
			"getThumbnailTypeById",
			"postThumbnailType",
			"putThumbnailType",
			"deleteThumbnailType"
		]);
	}

	getThumbnailType(request, response, next) {
		this.models.ThumbnailType
			.findAll()
			.then(thumbnailTypes => {
				if (thumbnailTypes) {
					if (request.hasPermission("admin.thumbnailType.read")) {
						response.json(
							thumbnailTypes.map(thumbnailType => {
								return thumbnailType.toJSON({ admin: true });
							})
						);
					} else {
						response.json(
							thumbnailTypes.map(thumbnailType => {
								return thumbnailType.toJSON();
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

	getThumbnailTypeById(request, response, next) {
		this.models.ThumbnailType
			.findOne({ where: { id: request.params.thumbnailTypeId } })
			.then(thumbnailType => {
				if (thumbnailType) {
					if (request.hasPermission("admin.thumbnailType.read")) {
						response.json(thumbnailType.toJSON({ admin: true }));
					} else {
						response.json(thumbnailType.toJSON());
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

	postThumbnailType(request, response, next) {
		let thumbnailType = this.models.ThumbnailType.build(
			this.pick(request.body.thumbnailType, ["name", "width", "height"])
		);

		if (request.hasPermission("admin.thumbnailType.write")) {
			thumbnailType.set(
				this.omitBy(this.pick(request.body.thumbnailType, ["id"]), this.isNil)
			);
		}

		thumbnailType
			.save()
			.then(() => {
				if (request.hasPermission("admin.thumbnailType.read")) {
					response.json(thumbnailType.toJSON({ admin: true }));
				} else {
					response.json(thumbnailType.toJSON());
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

	putThumbnailType(request, response, next) {
		this.models.ThumbnailType
			.findOne({ where: { id: request.params.thumbnailTypeId } })
			.then(thumbnailType => {
				if (thumbnailType) {
					thumbnailType.set(
						this.pick(request.body.thumbnailType, ["name", "width", "height"])
					);

					if (request.hasPermission("admin.thumbnailType.write")) {
						thumbnailType.set(
							this.omitBy(
								this.pick(request.body.thumbnailType, ["id"]),
								this.isNil
							)
						);
					}

					thumbnailType
						.save()
						.then(() => {
							if (request.hasPermission("admin.thumbnailType.read")) {
								response.json(thumbnailType.toJSON({ admin: true }));
							} else {
								response.json(thumbnailType.toJSON());
							}
						})
						.catch(err => {
							return next(
								new this.errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});
				} else {
					return next(new this.errorController.errors.NotFoundError());
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

	deleteThumbnailType(request, response, next) {
		this.models.ThumbnailType
			.findOne({ where: { id: request.params.thumbnailTypeId } })
			.then(thumbnailType => {
				if (thumbnailType) {
					thumbnailType
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
					return next(new this.errorController.errors.NotFoundError());
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
}

module.exports = ThumbnailTypeController;
