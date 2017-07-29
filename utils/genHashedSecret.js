const config = require("../config.json");
const CryptoUtils = new (require("../src/utilities/CryptoUtilities"))(config);

const secret = process.argv[2], salt = process.argv[3];

console.log(CryptoUtils.generateHash(secret, salt));