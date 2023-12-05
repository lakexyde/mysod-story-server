const { withData, withError } = require('../utils/responder'); 

const NotificationService = require('../services/notification');

const postRegisterToken = async (req, res) => {
    try {
        const result = await NotificationService.registerToken(req);
        return withData(res, result); 
    } catch (error) {
        return withError(res, error);
    }
}

module.exports = {
    postRegisterToken
}