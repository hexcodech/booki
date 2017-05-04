const File = ({ sequelize, models }) => {
	const pick = require("lodash/pick");
	const Sequelize = require("sequelize");

	const fs = require("fs");

	let File = sequelize.define(
		"file",
		{
			path: {
				type: Sequelize.STRING
			}
		},
		{
			classMethods: {
				associate: function({ Image }) {}
			},
			instanceMethods: {
				toJSON: function(options = {}) {
					let file = this.get();

					let json = pick(file, ["id", "path", "createdAt", "updatedAt"]);

					return json;
				}
			},
			hooks: {
				beforeDestroy: file => {
					return new Promise((resolve, reject) => {
						fs.unlink(file.get("path"), err => {
							if (err) {
								return reject(err);
							}

							resolve();
						});
					});
				}
			}
		}
	);

	return File;
};

module.exports = File;
