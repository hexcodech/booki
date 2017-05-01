module.exports = {
	escape: string => {
		return string.replace(/[^A-z0-9\s]/g, "\\$&");
	}
};
