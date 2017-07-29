class ThumbnailTypeController {
	constructor({ booki, models }) {
		this.pick = require("lodash/pick");
		this.omitBy = require("lodash/omitBy");
		this.isNil = require("lodash/isNil");

		this.models = models;

		[
			"getThumbnailType",
			"getThumbnailTypeById",
			"postThumbnailType",
			"putThumbnailType",
			"deleteThumbnailType"
		].forEach(key => {
			this[key] = this[key].bind(this);
		});
	}

	getThumbnailType(request, response, next) {
		this.models.ThumbnailType
			.findAll()
			.then(thumbnailTypes => {
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
			})
			.catch(next);
	}

	getThumbnailTypeById(request, response, next) {
		this.models.ThumbnailType
			.findOne({ where: { id: request.params.thumbnailTypeId } })
			.then(thumbnailType => {
				if (!thumbnailType) {
					return Promise.reject(new Error("This thumbnail type wasn't found!"));
				}

				if (request.hasPermission("admin.thumbnailType.read")) {
					response.json(thumbnailType.toJSON({ admin: true }));
				} else {
					response.json(thumbnailType.toJSON());
				}
				return response.end();
			})
			.catch(next);
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
			.catch(next);
	}

	putThumbnailType(request, response, next) {
		this.models.ThumbnailType
			.findOne({ where: { id: request.params.thumbnailTypeId } })
			.then(thumbnailType => {
				if (!thumbnailType) {
					return Promise.reject("This thumbnail type wasn't found!");
				}

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

				return thumbnailType.save().then(() => {
					if (request.hasPermission("admin.thumbnailType.read")) {
						response.json(thumbnailType.toJSON({ admin: true }));
					} else {
						response.json(thumbnailType.toJSON());
					}
				});
			})
			.catch(next);
	}

	deleteThumbnailType(request, response, next) {
		this.models.ThumbnailType
			.findOne({ where: { id: request.params.thumbnailTypeId } })
			.then(thumbnailType => {
				if (!thumbnailType) {
					return Promise.reject(new Error("This thumbnail type wasn't found!"));
				}

				return thumbnailType.destroy().then(() => {
					response.json({ success: true });
					response.end();
				});
			})
			.catch(next);
	}
}

module.exports = ThumbnailTypeController;
