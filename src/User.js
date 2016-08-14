/**
 * Handles all API calls on /user/
 * @param booki
 * @constructor
 */

var User = function (booki) {
    //keep reference to 'this'
    var self            = this;

    this.selectUserID = function (id, callback) {
        booki.sqlConnection.query("SELECT * FROM users WHERE id=" + id, function (err, results) {
            if(err)
                throw err;

            callback(JSON.stringify(results));
        });
    };
};

module.exports = User;