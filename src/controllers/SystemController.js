class SystemController {
	constructor({ booki, sequelize, models, folders, statsHolder }) {
		const bindAll = require("lodash/bindAll");

		this.sequelize = sequelize;
		this.models = models;
		this.statsHolder = statsHolder;
		this.folders = folders;

		this.os = require("os");
		this.fs = require("fs");
		this.async = require("async");
		this.exec = require("child_process").exec;

		bindAll(this, ["getStats", "cleanup"]);
	}

	getStats(request, response, next) {
		let cpuStats1 = this.os.cpus();

		setTimeout(() => {
			let cpuStats2 = this.os.cpus();

			let cpus = [];

			for (let i = 0; i < cpuStats1.length; i++) {
				let cpu = {
					model: cpuStats1[i].model,
					speed: Math.round((cpuStats1[i].speed + cpuStats2[i].speed) / 2),
					times: {}
				};

				for (let key in cpuStats1[i].times) {
					cpu.times[key] = cpuStats2[i].times[key] - cpuStats1[i].times[key];
				}

				cpus.push(cpu);
			}

			let cpuAverage = {};

			for (let i = 0; i < cpus.length; i++) {
				for (let key in cpus[i].times) {
					if (cpuAverage.hasOwnProperty(key)) {
						cpuAverage[key] += cpus[i].times[key];
					} else {
						cpuAverage[key] = cpus[i].times[key];
					}
				}
			}

			let stats = {
				cpus: cpus,
				cpuAverage: cpuAverage,
				cpuUsage: process.cpuUsage(),

				totalMemory: this.os.totalmem(),
				freeMemory: this.os.freemem(),
				memoryUsage: process.memoryUsage(),

				loadAverage: this.os.loadavg(),

				systemUptime: this.os.uptime(),
				processUptime: process.uptime(),

				os: this.os.type(),
				platform: this.os.platform(),

				hostname: this.os.hostname(),
				pid: process.pid,

				nodeVersion: process.version,

				bandwidth: this.statsHolder.getBandwidth()
			};

			response.json(stats);
			response.end();
		}, 500);
	}

	cleanup(request, response, next) {
		let promises = [];

		promises.push(
			this.sequelize
				.query(
					"SELECT images.* FROM images LEFT JOIN users ON images.user_id=users.id LEFT JOIN users as profilePictureUsers ON images.id=profilePictureUsers.profile_picture_id LEFT JOIN books ON images.id=books.cover_image_id WHERE users.id IS NULL OR (profilePictureUsers.id IS NULL AND books.id IS NULL)",
					{ type: this.sequelize.QueryTypes.SELECT }
				)
				.then(images => {
					let ids = images.map(image => image.id);

					return Promise.resolve(ids);
				})
		);

		promises.push(
			new Promise((resolve, reject) => {
				exec(
					"cd " + this.folders.uploads + " && find . -type file",
					(err, stdout, stderr) => {
						if (err) {
							reject(err);
						}

						let actualImages = stdout.split("\n").map(s => s.substring(1));
						this.models.Images
							.findAll({
								include: [{ model: this.models.File, as: "File" }]
							})
							.then(images => {
								images = new Set(
									images.map(Image => Image.get("File").get("path"))
								);
								let toDelete = new Set(
									actualImages.filter(image => !images.has(image))
								);
								resolve(Array.from(toDelete));
							});
					}
				);
			})
		);

		Promise.all(promises)
			.then(params => {
				if (request.query.check) {
					response.json({ deletableIds: params[0], unlinkedFiles: params[1] });
					return response.end();
				} else {
					//trigger hooks (hopefully)
					return this.models.Images
						.destroy({
							where: {
								id: {
									$in: ids
								}
							}
						})
						.then(() => {
							async.each(
								params[1],
								(path, callback) => fs.unlink(path, callback),
								err => {
									if (err) {
										next(err);
									}

									response.json({
										deletedIds: params[0],
										deletedUnlinkedFiles: params[1]
									});
									return response.end();
								}
							);
						});
				}
			})
			.catch(next);
	}
}

module.exports = SystemController;
