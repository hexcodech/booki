class ThumbnailTypeController{

	constructor({
		booki, models, errorController
	}){

		const bindAll                     = require('lodash/bindAll');
		this.pick                         = require('lodash/pick');
		this.omitBy                       = require('lodash/omitBy');
		this.isNil                        = require('lodash/isNil');

		this.errorController              = errorController;

		this.ThumbnailType                = models.ThumbnailType;

		bindAll(this, [
			'getThumbnailType',  'getThumbnailTypeById',
      'postThumbnailType', 'putThumbnailType', 'deleteThumbnailType'
		]);

	}

  getThumbnailType(request, response, next){
    this.ThumbnailType.findAll().then((thumbnailTypes) => {
			if(thumbnailTypes){
				if(request.hasPermission('admin.thumbnailType.hiddenData.read')){
					response.json(thumbnailTypes.map((thumbnailType) => {
						return thumbnailType.toJSON({hiddenData: true});
					}));
				}else{
					response.json(thumbnailTypes.map((thumbnailType) => {
						return thumbnailType.toJSON();
					}));
				}
				return response.end();
			}

			return next(new this.errorController.errors.UnexpectedQueryResultError());

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
  }

  getThumbnailTypeById(request, response, next){
    this.ThumbnailType.findById(request.params.thumbnailTypeId)
		.then((thumbnailType) => {

			if(thumbnailType){
				if(request.hasPermission('admin.thumbnailType.hiddenData.read')){
					response.json(thumbnailType.toJSON({hiddenData: true}));
				}else{
					response.json(thumbnailType.toJSON());
				}
				return response.end();
			}

			return next(new this.errorController.errors.UnexpectedQueryResultError());

		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
  }

  postThumbnailType(request, response, next){
		let thumbnailType = this.ThumbnailType.build(
			this.pick(request.body.thumbnailType, [
				'name', 'width', 'height'
			]
		));

		if(request.hasPermission('admin.thumbnailType.hiddenData.write')){
			thumbnailType.set(this.omitBy(this.pick(request.body.thumbnailType, [
				'id'
			]), this.isNil));
		}

		thumbnailType.save().then(() => {
			if(request.hasPermission('admin.thumbnailType.hiddenData.read')){
				response.json(thumbnailType.toJSON({hiddenData: true}));
			}else{
				response.json(thumbnailType.toJSON());
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
  }

  putThumbnailType(request, response, next){
		this.ThumbnailType.findById(request.params.thumbnailTypeId)
		.then((thumbnailType) => {

			if(thumbnailType){

				thumbnailType.set(this.pick(request.body.thumbnailType, [
					'name', 'width', 'height'
				]));

				if(request.hasPermission('admin.thumbnailType.hiddenData.write')){
					thumbnailType.set(this.omitBy(this.pick(request.body.thumbnailType, [
						'id'
					]), this.isNil));
				}

				thumbnailType.save().then(() => {
					if(request.hasPermission('admin.thumbnailType.hiddenData.read')){
						response.json(thumbnailType.toJSON({hiddenData: true}));
					}else{
						response.json(thumbnailType.toJSON());
					}
				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
  }

  deleteThumbnailType(request, response, next){
		this.ThumbnailType.findById(request.params.thumbnailTypeId)
		.then((thumbnailType) => {

			if(thumbnailType){
				thumbnailType.destroy().then(() => {
					reponse.end('{success: true}');
				}).catch((err) => {
					return next(new this.errorController.errors.DatabaseError({
						message: err.message
					}));
				});
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
  }
}

module.exports = ThumbnailTypeController;
