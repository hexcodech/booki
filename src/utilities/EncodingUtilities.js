class EncodingUtilities {
	serializeValidationError(obj) {
		return obj.errors
			.map(error => {
				return "ve[]=" + error.field;
			})
			.join("&");
	}
}

module.exports = EncodingUtilities;
