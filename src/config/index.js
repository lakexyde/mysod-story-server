const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "dev",
    appDataPath: process.env.APP_DATA_PATH || "~/sod",
    jwtKey: process.env.JWT_KEY,
    adminPassword: process.env.ADMIN_PASSWORD,
    adminEmail: "info@gloryrealmsministries.org",

    cookieDomains: (process.env.COOKIE_DOMAINS || "localhost").split(",").map(e => e.trim()),
    corsOrigins: (process.env.CORS_ORIGINS || "http://localhost").split(",").map(e => e.trim()),

    awsEndpoint: process.env.AWS_ENDPOINT,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsBucketName: process.env.AWS_BUCKET_NAME,
    awsRegion: process.env.AWS_REGION,

    webPushPublicKey: 'BOLOLL38szOPEDf-rBLapMoJPOeQv5q1o2FmRfSTr1WgkV5gdSWSFnWDEpSG1RHpI3tNAMBWYn1tRu809PzCp2k',
    webPushPrivateKey: 'EHE__DEwJrBprezvqw0t3gA7LFu-keQrJmMcJSfw3Lc',

}

module.exports = config;