/**
 * Handles all API calls on /book/
 * @param booki
 * @constructor
 */

var BookController = function(app, i18n, errors, mongoose){
    //store passed params
    this.app			= app;
    this.i18n			= i18n;
    this.errors			= errors;
    this.mongoose		= mongoose;

    //keep reference to 'this'
    var self            = this;

    //Require modules
    //this.Book			= require("../models/Book")(this.i18n, this.mongoose);

    this.events			= require("events");

    //init values
    this.eventEmitter	= new this.events.EventEmitter();
};

module.exports = BookController;