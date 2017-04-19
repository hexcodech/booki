class OfferController{

	constructor({
		booki, models, errorController
	}){

		const bindAll                     = require('lodash/bindAll');
		this.pick                         = require('lodash/pick');
		this.omitBy                       = require('lodash/omitBy');
		this.isNil                        = require('lodash/isNil');

		this.errorController              = errorController;

		this.Offer                        = models.Offer;

		this.Book                         = models.Book;
		this.User                         = models.User;
		this.Condition                    = models.Condition;

		bindAll(this, [
			'getOffer',  'getOfferById', 'getOfferByBookId',
      'postOffer', 'putOffer',     'deleteOffer'
		]);

	}

  getOffer(request, response, next){
    this.Offer.findAll().then((offers) => {
			if(offers){

				if(request.hasPermission('admin.offer.hiddenData.read')){
					response.json(offers.map((offer) => {
						return offer.toJSON({hiddenData: true});
					}));
				}else{
					response.json(offers.map((offer) => {
						return offer.toJSON();
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

  getOfferById(request, response, next){
    this.Offer.findById(request.params.offerId).then((offer) => {

			if(offer){
				if(request.hasPermission('admin.offer.hiddenData.read')){
					response.json(offer.toJSON({hiddenData: true}));
				}else{
					response.json(offer.toJSON());
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

	getOfferByBookId(request, response, next){
    this.Offer.findAll({where: {book_id: request.params.bookId}})
    .then((offers) => {

			if(offers){
				if(request.hasPermission('admin.offer.hiddenData.read')){
					response.json(offers.map((offer) => {
						return offer.toJSON({hiddenData: true});
					}));
				}else{
					response.json(offers.map((offer) => {
						return offer.toJSON();
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

  postOffer(request, response, next){
		let offer = this.Offer.build(this.pick(request.body.offer, [
			'description', 'price'
		]));

		let userId = request.hasPermission('admin.offer.hiddenData.write') &&
		             request.body.offer.userId ?
								 request.body.offer.userId :
								 request.user.get('id');

		this.Book.findById(request.body.offer.bookId).then((book) => {
			if(book){
				return this.Condition.findById(request.body.offer.conditionId);
			}else{
				return Promise.reject(new this.errorController.errors.NotFoundError());
			}
		}).then((condition) => {
			if(condition){
				return this.User.findById(userId);
			}else{
				return Promise.reject(new this.errorController.errors.NotFoundError());
			}
		}).then((user) => {
			if(user){
				return;
			}else{
				return Promise.reject(new this.errorController.errors.NotFoundError());
			}
		}).then(() => {
			offer.set({
				book_id        : request.body.offer.bookId,
				user_id        : userId,
				condition_id   : request.body.offer.conditionId,
			});

			if(request.hasPermission('admin.offer.hiddenData.write')){
				offer.set(this.omitBy(this.pick(request.body.offer, [
					'id'
				]), this.isNil));
			}

			return offer.save().catch((err) => {
				return Promise.reject(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			});
		}).then((offer) => {
			if(request.hasPermission('admin.offer.hiddenData.read')){
				response.json(offer.toJSON({hiddenData: true}));
			}else{
				response.json(offer.toJSON());
			}
		}).catch((error) => {
			return next(error);
		});
  }

  putOffer(request, response, next){
		this.Offer.findById(request.params.id).then((offer) => {
			if(offer){
				if(
					request.hasPermission('admin.offer.editOthers') ||
					offer.get('user_id') === request.user.get('id')
				){
					offer.set(this.pick(request.body.offer, [
						'description', 'price'
					]));

					let userId = request.hasPermission('admin.offer.hiddenData.write') &&
					             request.body.offer.userId ?
											 request.body.offer.userId :
											 request.user.get('id');

					this.Book.findById(request.body.offer.bookId).then((book) => {
						if(book){
							return this.Condition.findById(request.body.offer.conditionId);
						}else{
							return Promise.reject(
								new this.errorController.errors.NotFoundError()
							);
						}
					}).then((condition) => {
						if(condition){
							return this.User.findById(userId);
						}else{
							return Promise.reject(
								new this.errorController.errors.NotFoundError()
							);
						}
					}).then((user) => {
						if(user){
							return;
						}else{
							return Promise.reject(
								new this.errorController.errors.NotFoundError()
							);
						}
					}).then(() => {
						offer.set({
							book_id        : request.body.offer.bookId,
							user_id        : userId,
							condition_id   : request.body.offer.conditionId,
						});

						if(request.hasPermission('admin.offer.hiddenData.write')){
							offer.set(this.omitBy(this.pick(request.body.offer, [
								'id'
							]), this.isNil));
						}

						return offer.save().catch((err) => {
							return Promise.reject(
								new this.errorController.errors.DatabaseError({
									message: err.message
								})
							);
						});
					}).then((offer) => {
						if(request.hasPermission('admin.offer.hiddenData.read')){
							response.json(offer.toJSON({hiddenData: true}));
						}else{
							response.json(offer.toJSON());
						}
					}).catch((error) => {
						return next(error);
					});
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
		}).catch((err) => {
			return next(new this.errorController.errors.DatabaseError({
				message: err.message
			}));
		});
  }

  deleteOffer(request, response, next){
		this.Offer.findById(request.params.id).then((offer) => {
			if(offer){
				if(
					request.hasPermission('admin.offer.deleteOthers') ||
					offer.get('user_id') === request.user.get('id')
				){
					offer.destroy().then(() => {
						reponse.end('{success: true}');
					}).catch((err) => {
						return next(new this.errorController.errors.DatabaseError({
							message: err.message
						}));
					});
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
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

module.exports = OfferController;
