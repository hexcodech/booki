class BookController{
	
	constructor({booki, config, mongoose, errorController, bindAll, getLocale, generateRandomString, createObjectWithOptionalKeys}){
		
		this.config							= config;
		this.mongoose						= mongoose;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		this.generateRandomString			= generateRandomString;
		this.createObjectWithOptionalKeys	= createObjectWithOptionalKeys;
		
		this.Book							= this.mongoose.model("Book");
		
		bindAll(this, ["getBook", "getBookById", "postBook", "putBook", "deleteBook", "lookupBook"]);
		
	}
	
	getBook(request, response, next){
		
		//no need to filter the filters, the book resources are all available
		
		this.Book.find(request.body.filter, (err, books) => {
		
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(books){
				
				if(request.hasPermission("admin.book.rawData.read")){
				
					response.json(books.map((book) => {
						return book.toJSON({rawData: true});
					}));
					
				}else{
					
					response.json(books.map((book) => {
						return book.toJSON();
					}));
					
				}
				
				return response.end();
				
			}
			
			return next(new this.errorController.errors.UnexpectedQueryResultError());
			
		});
		
	}
	
	getBookById(request, response, next){
		this.Book.findOne({_id: request.params.bookId}, (err, book) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(book){
				
				if(request.hasPermission("admin.book.rawData.read")){
				
					response.json(book.toJSON({rawData: true}));
					
				}else{
					
					response.json(book.toJSON());
					
				}
				
				return response.end();
				
			}
			
			return next(new this.errorController.errors.UnexpectedQueryResultError());
		});
	}
	
	postBook(request, response, next){
		
		let bookData;
		
		if(request.hasPermissions(["admin.book.create", "admin.book.rawData.write"])){
			bookData = request.body.book;
			
			if(!bookData.createdBy){
				bookData.createdBy = request.user._id; //add cretor
			}
			
		}else{
			bookData = createObjectWithOptionalKeys(request.body.book, [
				"title", "subtitle", "language", "authors", "description", "publisher", "publicationDate", "pageCount", "imageUrls"
			]);
			
			bookData.createdBy = request.user._id; //add cretor
		}
		
		
		let book = new this.Book(bookData);
		
		book.save((err, book) => {
			
			if(err){
				
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(book){
				
				if(request.hasPermission("admin.book.rawData.read")){
					response.json(book.toJSON({rawData: true}));
				}else{
					response.json(book.toJSON());
				}
				
				return response.end();	
			}
			
			return next(new this.errorController.errors.UnexpectedQueryResultError());
		});
		
	}
	
	putBook(request, response, next){
		
		this.Book.findById(request.params.bookId, (err, book) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(book){
				
				let newBookData;
		
				if(request.hasPermission("admin.book.rawData.write")){
					newBookData = request.body.book;
				}else{
					newBookData = createObjectWithOptionalKeys(request.body.book, [
						"title", "subtitle", "language", "authors", "description", "publisher", "publicationDate", "pageCount", "images"
					]);
				}
				
				this.Book.findByIdAndUpdate(request.params.bookId, newBookData, {new: true}, (err, updatedBook) => {
		
					if(err){
						return next(new this.errorController.errors.DatabaseError({
							message: err.message
						}), null);
					}
					
					if(request.hasPermission("admin.book.rawData.read")){
						response.json(updatedBook.toJSON({rawData: true}));
					}else{
						response.json(updatedBook.toJSON());
					}
					
					return response.end();
					
				});
				
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
			
		});
		
	}
	
	deleteBook(request, response, next){
		
		this.Book.findById(request.params.bookId, (err, book) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(book){
				
				if(book.createdBy === request.user._id || request.hasPermission("admin.book.deleteOthers")){
					
					book.remove((err) => { //calls middleware
						
						if(err){
							return next(new this.errorController.errors.DatabaseError({
								message: err.message
							}), null);
						}
						
						response.json({success: true});
						response.end();
					});
						
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
				
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
			
		});
	}
	
	lookupBook(request, response, next){
		
		if(request.query.isbn){
			
			return this.Book.lookupByIsbn(request.query.isbn, (error, books) => {
				if(error){
					return next(error);
				}
				
				if(request.hasPermission("admin.book.rawData.read")){
					
					response.json(books.map((book) => {
						return book.toJSON({rawData: true});
					}));
					
				}else{
					
					response.json(books.map((book) => {
						return book.toJSON();
					}));
					
				}
				
				response.end();
				
			});
			
		}else if(request.query.title){
			
			return this.Book.lookupByTitle(request.query.title, (error, books) => {
				if(error){
					return next(error);
				}
				
				if(request.hasPermission("admin.book.rawData.read")){
					
					response.json(books.map((book) => {
						return book.toJSON({rawData: true});
					}));
					
				}else{
					
					response.json(books.map((book) => {
						return book.toJSON();
					}));
					
				}
				
				response.end();
				
			});
			
		}
		
		return next(new this.errorController.errors.NotFoundError());
		
	}
	
}

module.exports = BookController;