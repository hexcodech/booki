module.exports = ({ config }) => {
	const Joi = require("joi");

	return {
		query: {
			filter: {
				latestOffers: Joi.boolean()
			}
		}
	};
};
