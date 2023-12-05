const { withData, withError } = require('../utils/responder');
const AuthService = require('../services/auth');

const passwordLogin = async (req, res) => {
    try {
        const result = await AuthService.passwordLogin(req);
        return withData(res, result); 
    } catch (error) {
        return withError(res, error);
    }
}

const getSession = async (req, res) => {
    try {
        const response = await AuthService.getSession(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

const postLogout = async (req, res) => {
    try {
        return res.clearCookie("sod.token").send({ok: true, message: "User logged out successfully"});
    } catch (error) {
        return withError(res, error);
    }
}

module.exports = {
    getSession,
    postLogout,
    passwordLogin
}