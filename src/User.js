/**
 * Handles all API calls for on /user
 * @param booki
 * @constructor
 */

var User = function (booki) {
    //keep reference to 'this'
    var self            = this;

    this.selectUserID = function (id) {
        booki.sqlConnection.query("SELECT * FROM users WHERE id=" + id, function (err, results) {
            if(err)
                throw err;

            return results;
        });
    };
};

module.exports = User;