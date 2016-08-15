/**
 * Handles all API calls on /book/
 * @param booki
 * @constructor
 */

var BookController = function(sqlConnection){
    //keep reference to 'this'
    var self            = this;
    
    this.sqlConnection	= sqlConnection;
    this.config         = require("../../config.json");
    this.googlebooks	= require("google-books-search");

    this.selectBookISBN13 = function (id, callback) {
        this.sqlConnection.query("SELECT * FROM books WHERE isbn13=" + id, function (err, results) {
            if(err)
                throw err;
            callback(JSON.stringify(results));
        });
    };
    
    this.selectBookISBN13GoogleAPI = function (id, callback) {
        var queryOptions = {
            key:    this.config.GOOGLEBOOKS_API_KEY,
            field:  "isbn"
        };

        this.googlebooks.search(id.toString(), queryOptions, function (error, results, apiResponse) {
            if(error)
                throw error;

            callback(JSON.stringify(results));
        });
    };
};

module.exports = BookController;