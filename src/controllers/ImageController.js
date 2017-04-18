class ImageController{

	constructor({
		booki, models, errorController, folders, cryptoUtilities
	}){

		const bindAll               = require('lodash/bindAll');

    this.path                   = require('path');
		this.mkdirp                 = require('mkdirp-promise');

    this.Busboy                 = require('busboy');
    this.sharp                  = require('sharp');
    this.sizeOf                 = require('image-size');

		this.CryptoUtilities        = cryptoUtilities;

		this.folders                = folders;
		this.errorController        = errorController;

    this.File                   = models.File;
		this.Image                  = models.Image;

		bindAll(this, [
			'postImage', 'putImage', 'deleteImage'
		]);

		this.generatePath = (id) => {

			let d = new Date();


			return this.path.resolve(

				this.folders.uploads,
				d.getFullYear() + '',
				(d.getMonth() + 1) + '',
				//prevent the use as public image hosting api
				id + '-' +
				this.CryptoUtilities.generateRandomString(3) +
				'.png'
			);
		};

	}

	postImage(request, response, next){
		try{

			let busboy = new this.Busboy({ headers: request.headers });
			busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
				file.on('data', (data) => {
					if(
		        mimetype.startsWith('image/') &&
		        data.length <= 1024 * 1024 * 2
		      ){
						//FIXME 2 file entries are created
		        this.File.create({}).then((fileInstance) => {

		        	let dim    = this.sizeOf(data),
							    saveTo = this.generatePath(fileInstance.get('id'));

		          fileInstance.set('path', saveTo);

		          let image = this.Image.build({
		            width    : dim.width,
		            height   : dim.height,
		            mimeType : 'image/png',
		            user_id  : request.user ? request.user.get('id') : 1,
		            file_id  : fileInstance.get('id')
		          });

		          this.mkdirp(this.path.dirname(saveTo)).then(() => {
								return this.sharp(data).toFile(saveTo);
							}).then(() => {
		            return fileInstance.save();
		          }).then(() => {
		            return image.save();
							}).then(() => {
		            return image.reload(); //include 'File'
		          }).then(() => {
		            return image.generateThumbnails();
		          }).then(() => {
		            return image.reload(); //include 'Thumbnails'
		          }).then(() => {
		            if(request.hasPermission('admin.image.hiddenData.read')){
		      				response.json(image.toJSON({hiddenData: true}));
		      			}else{
		      				response.json(image.toJSON());
		      			}
		            response.end();

		          }).catch((err) => {
		            return next(new this.errorController.errors.DatabaseError({
		      				message: err.message
		      			}));
		          });
		        });

		      }else{
		        return next(new this.errorController.errors.InvalidImageError());
		      }
				});
	    });

			request.pipe(busboy);

		}catch(err){
			return next(new this.errorController.errors.BadRequestError({
				message: err.message
			}));
		}
	}

	putImage(request, response, next){

		this.Image.findById(request.query.id).then((image) => {

			if(
				request.hasPermission('admin.image.editOthers') ||
				image.get('user_id') === request.user.get('id')
			){

				try{

					let busboy = new this.Busboy({ headers: request.headers });
					busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

			      if(
			        mimetype.startsWith('image/') &&
			        file.byteLength <= 1024 * 1024 * 2
			      ){

							//create new file
							this.File.create({}).then((fileInstance) => {

								let dim    = this.sizeOf(file),
									  saveTo = this.generatePath(fileInstance.get('id'));

								//set file props
								fileInstance.set('path', saveTo);

								//update reference(s)
								image.set({
									width    : dim.width,
									height   : dim.height,
									mimeType : 'image/png',
									file_id  : fileInstance.get('id')
								});

								return fileInstance.save();

							}).then(() => {
								return image.save();
							}).then(() => {
								//remove old thumbnails
								return image.cleanThumbnails();
							}).then(() => {
								return image.generateThumbnails();
							}).then(() => {
								return image.reload();
							}).then(() => {
								if(request.hasPermission('admin.image.hiddenData.read')){
		      				response.json(image.toJSON({hiddenData: true}));
		      			}else{
		      				response.json(image.toJSON());
		      			}
		            response.end();

							}).catch((err) => {
								return next(
									new this.errorController.errors.InternalServerError({
										message: err.message
									})
								);
							});
			      }else{
			        return next(new this.errorController.errors.InvalidImageError());
			      }
			    });

					request.pipe(busboy);

				}catch(err){
					return next(new this.errorController.errors.BadRequestError());
				}
			}else{
				return next(new this.errorController.errors.ForbiddenError());
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

	deleteImage(request, response, next){
		this.Image.findById(request.query.id).then((image) => {
			if(
				request.hasPermission('admin.image.editOthers') ||
				image.get('user_id') === request.user.get('id')
			){
				image.destroy().then(() => {
					reponse.end('{success: true}');
				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});
			}else{
				return next(new this.errorController.errors.ForbiddenError());
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
	}

}

module.exports = ImageController;
