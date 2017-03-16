/**
 * The main class of this project
 */

class Booki {

	constructor(){

		this.booki                = this;

		//Require modules

		console.log('Loading modules...');

		this.crypto								= require('crypto');
		this.i18n                 = require('i18n');

		this.oauth2orize          = require('oauth2orize');
		this.passport             = require('passport');

		let requestStats        = require('request-stats');
		let bindAll             = require('lodash/bindAll');
		let Sequelize           = require('sequelize');
		let express             = require('express');
		let expressSession      = require('express-session');
		let bodyParser          = require('body-parser');
		let helmet              = require('helmet');

		//Load config
		console.log('Loading config..');
		this.config               = require('../config.json');

		bindAll(this, [
		 	'getLocale', 'generateRandomString', 'hash',
			'isObject',  'mergeDeep'
		]);

		//Configure i18n
		this.i18n.configure({
			locales        : this.config.LOCALES,
			defaultLocale  : this.config.LOCALES[0],
			directory      : __dirname + '/../locales',
			autoReload     : true,
			extension      : '.json',
			prefix         : 'booki-',
		});

		//Load error messages
		this.errorController = new (require(
			'./controllers/ErrorController')
		)(this);

		//Connect to to the database

		console.log('Connecting to the database...');

		this.sequelize = new Sequelize(
			this.config.DB_NAME,
			this.config.DB_USERNAME,
			this.config.DB_PASSWORD,
			{
			host: this.config.DB_HOST,
			dialect: 'mysql'/*|'mariadb'|'sqlite'|'postgres'|'mssql'*/,
			pool: {
				max  : 5,
				min  : 0,
				idle : 10000
			}
		});

		//Start the server

		console.log('Starting express server...');
		this.app = new express();

		this.server = this.app.listen(this.config.HTTP_PORT, () => {
			console.log(
				'Server running on',
				this.server.address().address + ':' + this.server.address().port
			);
		});

		//Configure the server
		console.log('Configuring express...');
		this.app.use('/static/',
			express.static(__dirname + '/../static'));
		this.app.use('/.well-known/',
			express.static(__dirname + '/../.well-known'));

		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({
			extended: true
		}));
		this.app.use(expressSession({//OAuth2orize requires it
			secret				: this.config.SESSION_SECRET,
			saveUninitialized	: true,
			resave				: true
		}));

		this.app.use(this.i18n.init);

		this.app.use(this.passport.initialize());
		this.app.use(this.passport.session());

		this.app.use(helmet());

		this.app.use(
			(request, response, next) => {

				response.header('Access-Control-Allow-Origin', '*');
				response.header(
					'Access-Control-Allow-Headers',
					'Origin, X-Requested-With, Content-Type, Accept, Authorization'
				);
				response.header(
					'Access-Control-Allow-Methods',
					'HEAD, OPTIONS, GET, POST, PUT, DELETE'
				);

				//UTF-8 JSON all the way EXCEPT /static/
				if(!request.url.startsWith('/static/')){
					response.header('Content-Type', 'application/json; charset=utf-8');
				}else{
					response.setHeader('charset', 'utf-8');
				}

				next();
			}
		);

		//add stats
		this.statsHolder = new (require('./StatsHolder'))(this);
		requestStats(this.server, this.statsHolder.requestCompleted);


		//Load all Models
		console.log('Loading models...');
		const modelFiles = [
			'Condition',     'Offer', 'File',             'ThumbnailType',

			'Thumbnail',     'Image', 'Permission',       'PermissionRelation',
			'OAuthProvider', 'User',  'OAuthRedirectUri', 'OAuthClient',
			'OAuthCode', 'OAuthAccessToken', 'Book'
		];

		this.models = {};

		modelFiles.forEach((model) => {
			this.models[model] = require(
				'./models/' + model
			)(this);
		});

		console.log('Associating models...');
		//Add associations
		for(let modelKey in this.models){
			console.log(modelKey);
			if(
				this.models.hasOwnProperty(modelKey) &&
				this.models[modelKey].associate
			){
				this.models[modelKey].associate(this.models);
			}
		}
		//setup tables if needed
		this.sequelize.sync();

		let {User, Permission, PermissionRelation} = this.models;

		User.upsert({id: 1, nameDisplay: 'hei', nameLast: 'joooo'})
		.then((success) => {
			User.findById(1).then((user) => {

				let p = Permission.upsert({id: 1, permission: 'admin'}).then((p)=>{

					let relation = PermissionRelation.upsert({id: 1}).then((r) => {
						r.setUser(user);
						r.setPermission(p);

						user.reload().then((user)=>{

							console.log('permission: ', user.getPermission());
							console.log(JSON.stringify(user.toJSON({hiddenData: true})));

						});

					});

				});

			});

		});

		/*this.OAuthClient			= require('./models/OAuthClient')(this);
		this.OAuthAccessToken		= require('./models/OAuthAccessToken')(this);
		this.OAuthCode				= require('./models/OAuthCode')(this);

		this.Book					= require('./models/Book')(this);*/

		//Do the routing
		console.log('Start routing...');
		require('./Routing')(this);
	}

	getLocale(user = null, request = null){
		if(user !== null){
			return user.get('locale');
		}else if(request !== null){
			return this.i18n.getLocale(request);
		}else{
			return this.config.LOCALES[0]
		}
	}

	/**
	 * Generates (unsafe) random string of characters
	 * @function generateRandomString
	 * @param {number} length - Length of the random string.
	 * @returns {String} A random string of a given length
	 */
	 generateRandomString(length){
		return this.crypto.randomBytes(length)
					.toString('base64')
					.slice(0, length);
	}

	/**
	 * Hash string using this.HASH_ALGORITHM or the passed algorithm
	 * @function hash
	 * @param {string} string - The string to be hashed
	 * @param {string} salt - The salt to be used while hashing
	 * @param {string} [algorithm=this.HASH_ALGORITHM] - The hash algorithm that
	 * should be used
	 * @returns {object} - The hashed string, the generated salt and the
	 * used hash algorithm {hash: '', salt: '', algorithm: ''}
	 */
	hash(string, salt = null, algorithm = null){

		if(!algorithm){
			algorithm = this.config.HASH_ALGORITHM;
		}

		if(!salt && salt !== false){
			salt = this.generateRandomString(this.config.SALT_LENGTH);
		}

			let hmacOrHash;

			if(salt){
				hmacOrHash = this.crypto.createHmac(algorithm, salt);
			}else{
				hmacOrHash = this.crypto.createHash(algorithm);
			}

			hmacOrHash.update(string);

			return {hash: hmacOrHash.digest('hex'), salt: salt, algorithm: algorithm};
	}

	/**
	 * Simple is object check.
	 * @param item
	 * @returns {boolean}
	 */
	isObject(item) {
		return (item && typeof item === 'object' && !Array.isArray(item));
	}

	/**
	 * Deep merge two objects.
	 * @param target
	 * @param source
	 */
	mergeDeep(target, source) {
		if(this.isObject(target) && this.isObject(source)){
			for (const key in source) {
				if (this.isObject(source[key])) {
					if (!target[key]) Object.assign(target, { [key]: {} });
					this.mergeDeep(target[key], source[key]);
				} else {
					Object.assign(target, { [key]: source[key] });
				}
			}
		}

		return target;
	}

};

module.exports = Booki;
