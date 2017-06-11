const config = require("../config.json");
const CryptoUtils = new (require("../src/utilities/CryptoUtilities"))(config);

console.log(CryptoUtils.generateRandomString(config.SALT_LENGTH));