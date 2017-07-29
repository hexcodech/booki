const Thumbnail = ({ folders, config, sequelize, models }) => {
	const path = require("path");
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	let Thumbnail = sequelize.define(
		"thumbnail",
		{},
		{
			defaultScope: {
				include: [
					{
						model: models.ThumbnailType,
						as: "ThumbnailType"
					},
					{
						model: models.File,
						as: "File"
					}
				]
			},

			hooks: {
				beforeDestroy: thumbnail => {
					return thumbnail.get("File").destroy();
				}
			}
		}
	);

	Thumbnail.associate = function({ File, Image, ThumbnailType }) {
		this.belongsTo(File, {
			as: "File",
			foreignKey: "file_id",
			onDelete: "cascade",
			hooks: true
		});
		this.belongsTo(Image, {
			as: "Image",
			foreignKey: "image_id"
		});
		this.belongsTo(ThumbnailType, {
			as: "ThumbnailType",
			foreignKey: "thumbnail_type_id"
		});
	};

	Thumbnail.prototype.getUrl = function() {
		return path.join(
			"/static/uploads/",
			this.get("File").get("path").split(folders.uploads)[1]
		);
	};

	Thumbnail.prototype.toJSON = function(options = {}) {
		let thumbnail = this.get();

		let json = pick(thumbnail, ["id", "createdAt", "updatedAt"]);

		json.imageId = thumbnail.image_id;

		if (thumbnail.File) {
			json.url = this.getUrl();

			if (options.admin) {
				json.fileId = thumbnail.file_id;
				json.file = thumbnail.File.toJSON(options);
			}
		}

		json.thumbnailTypeId = thumbnail.thumbnail_type_id;
		if (thumbnail.ThumbnailType) {
			Object.assign(
				json,
				pick(thumbnail.ThumbnailType.toJSON(options), [
					"name",
					"width",
					"height"
				])
			);
		}

		return json;
	};

	return Thumbnail;
};

module.exports = Thumbnail;
