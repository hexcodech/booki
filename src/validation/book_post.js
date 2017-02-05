var Joi             = require("joi");

module.exports      = {
    body:   {
        isbn10:         Joi.string().regex(/\d{9}./).required(),
        isbn13:         Joi.string().regex(/\d{13}/).required(),
        title:          Joi.string().alphanum().required(),
        authors:        Joi.string().required(),
        publisher:      Joi.string().alphanum().required(),
        publishDate:    Joi.string().required(),
        version:        Joi.number().integer().required(),
        pageCount:      Joi.number().integer().required(),
        language:       Joi.string().required(),
        imageUrl:       Joi.string().uri().required(),
        approved:       Joi.boolean().required()
    },
    options:    {
        allowUnknownBody: false,
        allowUnknownHeaders: true,
        allowUnknownQuery: false,
        allowUnknownParams: false,
        allowUnknownCookies: true
    }
};