function Book({mongoose, request, _, gbooks, errorController}){
	
	let bookSchema = new mongoose.Schema({
				
		isbn13						: {type: String,	unique: true, required: true},
		
		title						: {type: String,	required: false},
		subtitle					: {type: String,	required: false},
		
		language					: {type: String,	required: false},
		
		authors						: {type: Array,		required: false},
			
		description					: {type: String,	required: false},
		
		publisher					: {type: String,	required: false},
		publicationDate				: {type: Date,		required: false},
		
		pageCount					: {type: Number,	required: false},
		
		images						: {
			original					: {type: String,	required: false},
			sizes						: [new mongoose.Schema({
				size						: {type: String, required: true},
				url							: {type: String, required: true}
			})]
		},
		
		approved					: {type: Boolean,	default: false, 	required: true},
		dateCreated					: {type: Date,		default: Date.now,	required: true},
		createdBy					: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}
		
	});
	
	bookSchema.statics.request			= request; //for other APIs
	bookSchema.statics._				= _;
	bookSchema.statics.gbooks			= gbooks;
	bookSchema.statics.errorController	= errorController;
	
	bookSchema.statics.findOnGoogle = function(value = "", field = "isbn", offset = 0, limit = 10, type="all", order="relevance", lang = "", callback){
		
		let {_, gbooks, errorController} = this;
		
		gbooks.search(value, {field, type, offset, limit, type, order, lang}, (err, books) => {
			
			if(err){
				return calback(new errorController.errors.ApiError({
					message: err.message
				}), null);
			}
			
			if(books.length === 0){
				return callback(null, []);
			}
			
			
			return callback(null, books.map((book) => {
				
				let isbn = "";
			
				for(let i=0;i<book.industryIdentifiers.length;i++){
					if(book.industryIdentifiers[i].type === "ISBN_13"){
						isbn = book.industryIdentifiers[i].identifier;
					}
				}
				
				return new this({
					isbn13				: isbn,
					
					title				: _.get(book, "title"),
					subtitle			: _.get(book, "subtitle"),
					
					language			: _.get(book, "language"),
					
					authors				: _.get(book, "authors"),
						
					description			: _.get(book, "description"),
					
					publisher			: _.get(book, "publisher"),
					publicationDate		: new Date(_.get(book, "publishedDate")),
					
					pageCount			: _.get(book, "pageCount"),
					
					images				: {
						original			:	_.get(book, "images.extraLarge")	? _.get(book, "images.extraLarge")	:
												_.get(book, "images.large")			? _.get(book, "images.large")		:
												_.get(book, "images.medium")		? _.get(book, "images.medium")		:
												_.get(book, "images.small")			? _.get(book, "images.small")		:
												_.get(book, "thumbnail")
					},
					
				});
			}));
			
		});
	};
	
	bookSchema.statics.lookupByIsbn = function(isbn = "", callback){
		
		let {errorController} = this;
		
		isbn = isbn.replace(/(-|\s)/g, ""); //remove spaces and dashes
		
		if(isbn.length === 10){ //convert isbn10 to isbn13
			isbn = "978" + isbn;
		}
		
		//even tought this function shouldn't even be called if the book is already present, we double check
		this.find({isbn13: isbn}, (err, books) => {
			if(err){
				return callback(new errorController.errors.DatabaseError({
					message: err.message
				}), null);
			}
			
			if(books){
				//yeah, the isbn is already in our database
				return callback(null, books);
				
			}else{
				//let the games begin
				
				//lets start with google books
				return this.findOnGoogle(isbn, "isbn", 0, 10, "all", "relevance", "", callback);
				
			}
			
		});
		
	};
	
	bookSchema.statics.lookupByTitle = function(title = "", page = 0, callback){
		this.findOnGoogle(title, "title", 10 * page, 10, "all", "relevance", "", callback);
	};
	
	bookSchema.set("toJSON", {
		transform: (doc, ret, options) => {
			return ret;
		}
	});
	
	return mongoose.model("Book", bookSchema);
	
};

module.exports = Book;