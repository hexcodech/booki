var Joi             = require("joi");

module.exports      = {
    params:   {
        id:     Joi.string().regex(/\d{13}/).required()
    },
    options:    {
        allowUnknownBody: false,
        allowUnknownHeaders: true,
        allowUnknownQuery: false,
        allowUnknownParams: false,
        allowUnknownCookies: true
    }
};
