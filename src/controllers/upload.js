const UploadService = require('../services/upload');
const { withData, withError } = require('../utils/responder');

const postGetSignedUrl = async (req, res) => {
    try {
        const response = await UploadService.getUploadUrl(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

const getUploads = async (req, res) => {
    try {
        const response = await UploadService.findUploads(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

const putUpload = async (req, res) => {
    try {
        const response = await UploadService.updateUpload(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

const postCreateStory = async (req, res) => {
    try {
        const response = await (require('../services/upload/merge')).createStory(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

const postNotifyUpload = async (req, res) => {
    try {
        const response = await UploadService.notifyUpload(req);
        return withData(res, response);
    } catch (error) {
        return withError(res, error);
    }
}

module.exports = {
    postGetSignedUrl,
    getUploads,
    postCreateStory,
    putUpload,
    postNotifyUpload
}