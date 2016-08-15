/**
 * Handles all API calls on /book/
 * @param booki
 * @constructor
 */

var BookController = function(sqlConnection){
    //keep reference to 'this'
    var self            = this;
    
    this.sqlConnection	= sqlConnection;

    this.selectBookISBN13 = function (id, callback) {
        this.sqlConnection.query("SELECT * FROM books WHERE isbn13=" + id, function (err, results) {
            if(err)
                throw err;

            callback(JSON.stringify(results));
        });
    };
};

module.exports = BookController;