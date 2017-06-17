/**
 * The main class of this project
 */

class Booki {
	constructor() {
		const path = require("path");

		this.booki = this;

		this.folders = {
			uploads: path.resolve(__dirname, "../static/uploads"),
			logs: path.resolve(__dirname, "../logs")
		};

		if (process.env.DOCKER) {
			console.log("Running inside docker!");
			console.log("Using config located at /run/secrets/booki-config.json");
			this.config = require("/run/secrets/booki-config.json");

			console.log("Using upload folder: /uploads");
			this.folders.uploads = "/uploads";

			console.log("Using log folder: /logs");
			this.folders.logs = "/logs";
		} else {
			this.config = require("../config.json");
		}

		//Loading 'shared' modules
		this.oauth2orize = require("oauth2orize");
		this.passport = require("passport");
		this.cryptoUtilities = new (require("./utilities/CryptoUtilities"))(
			this.config
		);

		//setup with dependencies
		this.checkIfWritable(this.folders)
			.then(() => {
				return this.setupLogger(this.folders).then(({ winston, logger }) => {
					this.winston = winston;
					this.logger = logger;

					return Promise.all([
						this.setupI18n(logger, this.config).then(i18n => {
							this.i18n = i18n;

							return this.setupHttpServer(
								logger,
								this.config,
								i18n,
								this.passport,
								this.folders
							).then(({ app, server }) => {
								this.app = app;
								this.server = server;

								return Promise.all([
									this.setupStats(server, this.config).then(statsHolder => {
										this.statsHolder = statsHolder;
									})
								]);
							});
						}),

						this.connectToDatabase(logger, this.config).then(sequelize => {
							this.sequelize = sequelize;
						})
					]);
				});
			})
			.then(() => {
				return this.loadModels(
					this.logger,
					this.folders,
					this.config,
					this.sequelize,
					this.cryptoUtilities
				);
			})
			.then(models => {
				this.models = models;
			})
			.then(() => {
				//sync sequelize
				this.sequelize.sync();
			})
			.then(() => {
				this.piwikTracker = require("piwik-tracker")(
					this.config.PIWIK_TRACKING_SITE_ID,
					this.config.PIWIK_TRACKING_URL
				);
			})
			.then(() => {
				//Do the routing
				this.logger.log("info", "Setting up routes");

				require("./Routing")(this);
			})
			.catch(e => {
				console.log(e);
				process.exit(1);
			});
	}

	checkIfWritable(folders) {
		const fs = require("fs");

		let keys = Object.keys(folders),
			promises = [];

		for (let i = 0; i < keys.length; i++) {
			promises.push(
				new Promise((resolve, reject) => {
					if (!fs.existsSync(folders[keys[i]])) {
						reject(
							new Error("The folder " + folders[keys[i]] + " doesn't exist!")
						);
					}
					fs.access(folders[keys[i]], fs.W_OK, err => {
						if (err) {
							reject(new Error("Can't write to " + folders[keys[i]]));
						}

						resolve();
					});
				})
			);
		}

		return Promise.all(promises);
	}

	setupLogger(folders) {
		let winston = require("winston");

		let logger = new winston.Logger({
			transports: [
				new winston.transports.Console({
					name: "console-log",
					level: "debug",
					colorize: true,
					prettyPrint: true
				}),
				new winston.transports.File({
					name: "file-log",
					level: "debug",
					filename: folders.logs + "/booki.log",
					handleExceptions: true,
					colorize: false,
					prettyPrint: true
				})
			],
			levels: {
				critical: 0,
				error: 1,
				warning: 2,
				info: 3,
				debug: 4
			}
		});

		winston.addColors({
			critical: "red",
			error: "red",
			warning: "yellow",
			info: "blue",
			debug: "magenta"
		});

		return Promise.resolve({ winston, logger });
	}

	setupI18n(logger, config) {
		logger.log("info", "Configuring i18n");

		let i18n = require("i18n");

		i18n.configure({
			locales: config.LOCALES,
			defaultLocale: config.LOCALES[0],
			directory: __dirname + "/../locales",
			autoReload: true,
			extension: ".json",
			prefix: "booki-"
		});

		return Promise.resolve(i18n);
	}

	connectToDatabase(logger, config) {
		logger.log("info", "Connecting to the database...");

		const Sequelize = require("sequelize");

		let sequelize = new Sequelize(
			config.DB_NAME,
			config.DB_USERNAME,
			config.DB_PASSWORD,
			{
				host: this.config.DB_HOST,
				port: this.config.DB_PORT,
				dialect: "mysql",
				pool: {
					max: 5,
					min: 0,
					idle: 10000
				},
				logging: null
			}
		);

		return Promise.resolve(sequelize);
	}

	setupHttpServer(logger, config, i18n, passport, folders) {
		logger.log("info", "Starting express server...");

		const express = require("express");
		const expressSession = require("express-session");
		const bodyParser = require("body-parser");
		const helmet = require("helmet");
		const compression = require("compression");

		let app = new express();

		let server = app.listen(config.HTTP_PORT, "0.0.0.0", () => {
			logger.log(
				"info",
				"Server running on",
				server.address().address + ":" + server.address().port
			);
		});

		//Configure the server
		logger.log("info", "Configuring express...");

		//gzip
		app.use(compression());

		//static resources

		//seperate statement for uploads because of docker
		app.use("/static/uploads/", express.static(folders.uploads));
		app.use("/static/", express.static(__dirname + "/../static"));

		//prove identity to letsencrypt
		if (process.env.DOCKER) {
			app.use("/.well-known/", express.static("/run/secrets/.well-known"));
		} else {
			app.use("/.well-known/", express.static(__dirname + "/../.well-known"));
		}

		//parse json
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));

		//and enable sessions of oauth2orize
		app.use(
			expressSession({
				secret: config.SESSION_SECRET,
				saveUninitialized: true,
				resave: true
			})
		);

		//include i18n middleware
		app.use(i18n.init);

		//setup passport for authentication
		app.use(passport.initialize());
		app.use(passport.session());

		//harden express
		app.use(helmet());

		//set default headers and attach functions
		app.use((request, response, next) => {
			response.header("Access-Control-Allow-Origin", "*");
			response.header(
				"Access-Control-Allow-Headers",
				"Origin, X-Requested-With, Content-Type, Accept, Authorization"
			);
			response.header(
				"Access-Control-Allow-Methods",
				"HEAD, OPTIONS, GET, POST, PUT, DELETE"
			);

			//UTF-8 JSON all the way EXCEPT /static/
			if (/^\/v[0-9]/.test(request.url)) {
				response.header("Content-Type", "application/json; charset=utf-8");
			} else {
				response.setHeader("charset", "utf-8");
			}

			next();
		});

		return Promise.resolve({ app, server });
	}

	setupStats(server, config) {
		const requestStats = require("request-stats");
		const statsHolder = new (require("./StatsHolder"))(config);

		requestStats(server, statsHolder.requestCompleted);

		return Promise.resolve(statsHolder);
	}

	loadModels(logger, folders, config, sequelize, cryptoUtilities) {
		logger.log("info", "Loading models...");

		const Sequelize = require("sequelize");

		const modelFiles = [
			"Person", //no init dependencies
			"Condition", //no init dependencies
			"File", //no init dependencies
			"ThumbnailType", //no init dependencies
			"Permission", //no init dependencies
			"OAuthProvider", //no init dependencies
			"OAuthRedirectUri", //no init dependencies

			"Thumbnail", //requires 'File' AND 'ThumbnailType'
			"Image", //requires 'File' AND 'Thumbnail'

			"User", //requires 'Permission' AND 'Image' AND 'OAuthProvider'

			"Offer", //requires 'Condition' AND 'User'
			"OfferRequest", //requires 'Offer' AND 'User'

			"Book", //requires 'Image' AND 'Person' AND 'Offer'

			"OAuthClient", //requires 'OAuthRedirectUri' AND 'User'

			"OAuthCode", //requires 'OAuthClient' AND 'User'
			"OAuthAccessToken" //requires 'OAuthClient' AND 'User'
		];

		let models = {};

		modelFiles.forEach(model => {
			models[model] = require("./models/" + model)({
				folders,
				config,
				sequelize,
				models,
				cryptoUtilities
			});

			if (models[model].attributes.id) {
				models[model].attributes.id.type = Sequelize.BIGINT.UNSIGNED;
			}
		});

		logger.log("info", "Associating models...");

		//Add associations
		for (let modelKey in models) {
			if (models.hasOwnProperty(modelKey) && models[modelKey].associate) {
				models[modelKey].associate(models);
			}
		}

		return Promise.resolve(models);
	}
}

module.exports = Booki;
