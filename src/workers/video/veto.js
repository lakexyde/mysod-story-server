const dayjs = require("dayjs");
const { awsClient } = require("../../config/s3");
const { HeadObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const config = require("../../config");
const { UploadModel } = require("../../models");

const vetoVideo = async (video, cb) => {

    // get the start time
    const start = dayjs();

    try {

        // if video or upload_url does not exists, return
        if (!video || !video?.upload_url) {
            throw "Bad request";
        }
        // #1. delete key on aws and database
        // check if the key is present
        let key = new URL(video.upload_url).pathname.substring(1);
        let exists = await objectExists(key)

        // delete object if exists
        if (exists) {
            await awsClient.send(new DeleteObjectCommand({
                Bucket: config.awsBucketName,
                Key: key
            }))
        }

        // delete video if exists
        if (video.url) {
            let key = new URL(video.url).pathname.substring(1);
            let exists = await objectExists(key)

            // delete object if exists
            if (exists) {
                await awsClient.send(new DeleteObjectCommand({
                    Bucket: config.awsBucketName,
                    Key: key
                }))
            }
        }

        // remove thumbnail if possible
        if (video.thumbnail_url) {
            // check if thumbnail exists
            exists = await objectExists(new URL(video.thumbnail_url).pathname.substring(1))

            // delete object if exists
            if (exists) {
                await awsClient.send(new DeleteObjectCommand({
                    Bucket: config.awsBucketName,
                    Key: new URL(video.thumbnail_url).pathname.substring(1)
                }))
            }
        }

        // update database based on status
        await UploadModel.remove(video.id);

    } catch (error) {
        console.log(error);
    } finally {
        cb()
        // log the time it took to complete the request
        const end = dayjs().diff(start, 'seconds');
        console.log("Finished in: ", end, "seconds");
    }
}

module.exports = {
    vetoVideo
}

function objectExists(key) {
    return new Promise((resolve, reject) => {
        awsClient.send(new HeadObjectCommand({
            Bucket: config.awsBucketName,
            Key: key
        }))
        .then(res => {
            if (res.$metadata.httpStatusCode !== 200) {
                reject(false);
                return;
            } 

            switch (res.$metadata.httpStatusCode) {
                case 200: return resolve(true);
                default: return reject(false);
            }
        })
        .catch(err => reject(false));
    })
}