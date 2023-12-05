var randomstring = require("randomstring");

const genId = (length = 16) => {
    return randomstring.generate({ length, charset: 'numeric' });
}

const docId = (length = 36) => randomstring.generate({ length });

module.exports = {
    genId,
    docId
}