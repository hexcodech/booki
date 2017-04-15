class CryptoUtilities{

  /**
	 * Generates random string of characters
	 * @function generateRandomString
	 * @param {number} length - Length of the random string.
	 * @returns {String} A random string of a given length
	 */
	 static generateRandomString(length){

		 return this.crypto.randomBytes(length)
		        .toString('base64')
						.slice(0, length);
	}

	/**
	 * Hash string using this.HASH_ALGORITHM or the passed algorithm
	 * @function generateHash
	 * @param {string} string - The string to be hashed
	 * @param {string} salt - The salt to be used while hashing
	 * @param {string} [algorithm=this.HASH_ALGORITHM] - The hash algorithm that
	 * should be used
	 * @returns {object} - The hashed string, the generated salt and the
	 * used hash algorithm {hash: '', salt: '', algorithm: ''}
	 */
	static generateHash(string, salt = null, algorithm = null){

		if(!algorithm){
			algorithm = this.config.HASH_ALGORITHM;
		}

		if(!salt && salt !== false){
			salt = this.generateRandomString(this.config.SALT_LENGTH);
		}

			let hmacOrHash;

			if(salt){
				hmacOrHash = this.crypto.createHmac(algorithm, salt);
			}else{
				hmacOrHash = this.crypto.createHash(algorithm);
			}

			hmacOrHash.update(string);

			return {hash: hmacOrHash.digest('hex'), salt: salt, algorithm: algorithm};
	}

	/**
	 * Simple is object check.
	 * @param item
	 * @returns {boolean}
	 */
	static isObject(item) {
		return (item && typeof item === 'object' && !Array.isArray(item));
	}

	/**
	 * Deep merge two objects.
	 * @param target
	 * @param source
	 */
	static mergeDeep(target, source) {
		if(this.isObject(target) && this.isObject(source)){
			for (const key in source) {
				if (this.isObject(source[key])) {
					if (!target[key]) Object.assign(target, { [key]: {} });
					this.mergeDeep(target[key], source[key]);
				} else {
					Object.assign(target, { [key]: source[key] });
				}
			}
		}

		return target;
	}
}

module.exports = CryptoUtilities;
