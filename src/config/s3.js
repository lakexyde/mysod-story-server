const { S3Client } = require("@aws-sdk/client-s3");
const config = require('.');

const awsClient = new S3Client({
    region: config.awsRegion,
    // endpoint: config.awsEndpoint,
    credentials: Promise.resolve({
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
    }) 
});

module.exports = {
    awsClient
};