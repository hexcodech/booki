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
			charset: "utf8",
			collate: "utf8_unicode_ci",
			hooks: {
				beforeDestroy: file => {
					return new Promise((resolve, reject) => {
						fs.stat(file.get("path"), (err, stat) => {
							if (err == null) {
								fs.unlink(file.get("path"), err => {
									if (err) {
										return reject(err);
									}

									resolve();
								});
							} else if (err.code == "ENOENT") {
								resolve();
							} else {
								reject(new Error("Some other error: " + err.code));
							}
						});
					});
				}
			}
		}
	);

	File.associate = function() {};

	File.prototype.toJSON = function(options = {}) {
		let file = this.get();

		let json = pick(file, ["id", "path", "createdAt", "updatedAt"]);

		return json;
	};

	return File;
};

module.exports = File;
