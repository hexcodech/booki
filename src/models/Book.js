function Book({}){
	
	var bookSchema = new mongoose.Schema({
        subjectID                   : {type: Number, required: true},
        isbn10                      : {type: String, required: true},
        isbn12                      : {type: Number, required: true},

        title                       : {type: String, required: false},
        authors                     : {type: Array, required: false},
        publisher                   : {type: String, required: false},
        publishDate                 : {type: Date, required: false},

        version                     : {type: Number, required: false},
        pageCount                   : {type: Number, required: false},
        language                    : {type: String, required: false},

        imageURL                    : {type: String, required: false},

        approved                    : {type: Boolean, required: true},
        dateCreated                 : {type: Date, "default": Date.now, required: true},
        createdByUser               : {type: Number, required: true}
    });
    
};

module.exports = Book;