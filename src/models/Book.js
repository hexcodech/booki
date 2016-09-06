/**
 * Defines the book structure.
 * @param i18n
 * @param mongoose
 * @constructor
 */
var User = function(i18n, mongoose){
    //store passed params
    this.i18n					= i18n;
    this.mongoose				= mongoose;

    var self					= this;

    //include required modules
    this.crypto					= require("crypto");

    //Load config
    this.config					= require("../../config.json");

    //setup some values
    this.types					= this.mongoose.Schema.Types;


    var bookSchema = new this.mongoose.Schema({
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

        imageURL                    : {type: this.mongoose.Schema.Types.URL, required: false},

        approved                    : {type: Boolean, required: true},
        dateCreated                 : {type: Date, "default": Date.now, required: true},
        createdByUser               : {type: Number, required: true}
    });

    
};

module.exports = User;