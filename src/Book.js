/**
 * Created by Marc on 14.08.2016.
 */

var Book = function (booki) {
    //keep reference to 'this'
    var self            = this;

    this.selectBookISBN13 = function (id, callback) {
        booki.sqlConnection.query("SELECT * FROM books WHERE isbn13=" + id, function (err, results) {
            if(err)
                throw err;

            callback(JSON.stringify(results));
        });
    };
};

module.exports = Book;