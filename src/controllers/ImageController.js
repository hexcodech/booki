class ImageController{

	constructor({
		booki, models, errorController, folders
	}){

		const bindAll                     = require('lodash/bindAll');

    const fs                          = require('fs');
    const path                        = require('path');
    const async                       = require('async');

    const Busboy                      = require('busboy');
    const sharp                       = require('sharp');
    const sizeOf                      = require('image-size');

    const CryptoUtilities             = require('../utilities/CryptoUtilities');

		this.errorController              = errorController;

    this.File                         = models.File;
		this.Image                        = models.Image;

		bindAll(this, [
			'uploadImage'
		]);

	}

	uploadImage(request, response, next){
		let busboy = new Busboy({ headers: request.headers });
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

      if(
        mimetype.startsWith('image/') &&
        file.byteLength <= 1024 * 1024 * 2
      ){

        this.File.create({}).then((fileInstance) => {

          let d = new Date(), dim = sizeOf(file);

          let saveTo = path.resolve(
            folders.uploads,
            d.getFullYear(),
            d.getMonth() + 1,
            //prevent the use as public image hosting api
            fileInstance.get('id') + '-' +
            CryptoUtilities.generateRandomString(3) +
            '.png'
          );

          fileInstance.set('path', saveTo);

          let image = this.Image.build({
            width    : dim.width,
            height   : dim.height,
            mimeType : 'image/png',
            user_id  : request.user.get('id'),
            file_id  : fileInstance.get('id')
          });

          sharp(File).toFile(saveTo).then(() => {
            return fileInstance.save();
          }).then(() => {
            return image.save();
          }).then((thumbnailTypes) => {
            return image.generateThumbnails();
          }).then(() => {
            image.reload();
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
        //TODO change to invalid image upload error
        return next(new this.errorController.errors.DatabaseError({
          message: err.message
        }));
      }

    });
    //TODO change to invalid request error
    return next(new this.errorController.errors.DatabaseError({
      message: err.message
    }));
	}

}

module.exports = ImageController;
