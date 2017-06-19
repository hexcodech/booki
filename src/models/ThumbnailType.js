const ThumbnailType = ({ sequelize }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	let ThumbnailType = sequelize.define("thumbnail_type", {
		name: {
			type: Sequelize.STRING
		},
		width: {
			type: Sequelize.INTEGER
		},
		height: {
			type: Sequelize.INTEGER
		}
	});

	ThumbnailType.associate = function({ Thumbnail }) {
		this.hasMany(Thumbnail, {
			as: "Thumbnails",
			foreignKey: "thumbnail_type_id",
			onDelete: "cascade",
			hooks: true
		});
	};

	ThumbnailType.prototype.toJSON = function(options = {}) {
		let type = this.get();

		let json = pick(type, ["id", "name", "width", "height"]);

		return json;
	};

	return ThumbnailType;
};

module.exports = ThumbnailType;
