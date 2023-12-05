const { withData, withError } = require('../utils/responder');
const AuthService = require('../services/auth');


const getSession = async (req, res) => {
    try {
        const response = await AuthService.getSession(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

module.exports = {
    getSession
}