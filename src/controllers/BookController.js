class BookController{
	
	constructor({booki, config, mongoose, errorController, bindAll, getLocale, generateRandomString, createObjectWithOptionalKeys}){
		
		this.config							= config;
		this.mongoose						= mongoose;
		this.errorController				= errorController;
		
		this.getLocale						= getLocale;
		this.generateRandomString			= generateRandomString;
		this.createObjectWithOptionalKeys	= createObjectWithOptionalKeys;
		
		this.Book							= this.mongoose.model("Book");
		
		bindAll(this, ["getBook", "lookupBookByIsbn", "lookupBookByTitle", "postBook", "getBookById", "postBook", "putBook", "deleteBook"]);
		
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
				
				if(request.user.hasPermission("admin.book.rawData.read")){
				
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
	
	lookupBookByIsbn(request, response, next){
		this.Book.lookupByIsbn(request.body.isbn, (error, book) => {
			if(error){
				return next(error);
			}
			
			if(request.user.hasPermission("admin.book.rawData.read")){
				
				response.json(book.toJSON({rawData: true}));
				
			}else{
				
				response.json(book.toJSON());
				
			}
			
			response.end();
			
		});
	}
	
	lookupBookByTitle(request, response, next){
		this.Book.lookupByTitle(request.body.title, (error, books) => {
			if(error){
				return next(error);
			}
			
			if(request.user.hasPermission("admin.book.rawData.read")){
				
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
	
	getBookById(request, response, next){
		this.Book.findOne({_id: request.params.bookId}, (err, book) => {
			
			if(err){
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(book){
				
				if(request.user.hasPermission("admin.book.rawData.read")){
				
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
		
		let secret = this.Book.generateSecret();
		
		let bookData;
		
		if(request.user.hasPermissions(["admin.book.create", "admin.book.rawData.write"])){
			bookData = request.body.book;
		}else{
			bookData = createObjectWithOptionalKeys(request.body.book, [
				"title", "subtitle", "language", "authors", "description", "publisher", "publishDate", "pageCount", "imageUrls"
			]);
		}
		
		bookData.createdBy = request.user._id; //add cretor
		
		
		
		let book = new this.Book(bookData);
		
		book.save((err, book) => {
			
			if(err){
				
				return next(new this.errorController.errors.DatabaseError({
					message: err.message
				}));
			}
			
			if(book){
				
				if(request.user.hasPermission("admin.book.rawData.read")){
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
		
				if(request.user.hasPermission("admin.book.rawData.write")){
					newBookData = request.body.book;
				}else{
					newBookData = createObjectWithOptionalKeys(request.body.book, [
						"title", "subtitle", "language", "authors", "description", "publisher", "publishDate", "pageCount", "imageUrls"
					]);
				}
				
				this.Book.findByIdAndUpdate(request.params.bookId, newBookData, {new: true}, (err2, updatedBook) => {
		
					if(err2){
						return next(new this.errorController.errors.DatabaseError({
							message: err2.message
						}), null);
					}
					
					if(request.user.hasPermission("admin.book.rawData.read")){
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
				
				if(book.createdBy === request.user._id || request.user.hasPermission("admin.book.deleteOthers")){
					
					this.Book.findByIdAndRemove(request.params.bookId, (err) => {
						
						if(err){
							return next(new this.errorController.errors.DatabaseError({
								message: err.message
							}), null);
						}
						
						response.json({success: true});
						response.end();
					});
					
					return;
						
				}else{
					return next(new this.errorController.errors.ForbiddenError());
				}
				
			}else{
				return next(new this.errorController.errors.NotFoundError());
			}
		});
		
	}
}

module.exports = BookController;