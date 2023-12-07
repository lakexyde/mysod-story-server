const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const { awsClient } = require("../../config/s3");
const { genId } = require("../../utils/gen");
const Joi = require('joi');

const config = require("../../config");
const { getQueue } = require('../../config/queue')
const { UploadModel } = require("../../models");
const dayjs = require("dayjs");

const getUploadUrl = async ({user, body }) => {

    let schema = Joi.object({
        "sender": Joi.object({
            "name": Joi.string()
        }).optional().options({stripUnknown: true}),
    }).options({stripUnknown: true});

    // validate the schema
    let validate = schema.validate(body);

    if(validate.error != null){
        throw `[400]${validate.error.message}`
    }

    // get the validated data
    var data = validate.value;

    const command = new PutObjectCommand({
        Bucket: config.awsBucketName,
        Key: `sod-story/dumps/${genId()}`,
        ContentType: "application/octet-stream",
        ACL: "public-read"
    });

    const url = await getSignedUrl(awsClient, command, {
        expiresIn: 3600
    })

    let uri = new URL(url);
    uri.search = "";

    data = Object.assign({}, data, {
        upload_url: uri.toString(),
        user
    });

    // save to the database
    await UploadModel.initialize(data);

    return {
        ok: true,
        data: {
            url,
        }
    }
}

const findUploads = async ({ user, query }) => {
    let schema = Joi.object({
        "page": Joi.number().default(1),
        "limit": Joi.number().default(10),
        "search": Joi.string(),
        "status": Joi.string(),
        "orderby": Joi.string(),
        "sorting": Joi.string(),
        "date_min": Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).error(new Error("date format invalid")).allow("", null),
        "date_max": Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).regex(/^\d{4}-\d{2}-\d{2}$/).error(new Error("date format invalid")).allow("", null),
    }).options({stripUnknown: true});

    const validate = schema.validate(query);

    var params = validate.value;
    params.skip = (params.limit * params.page) - params.limit;

    let match = {
        role: user?.role,
        limit: params.limit,
        skip: params.skip
    };

    if (user?.role !== "admin") {
        params.status = "publish";
    } 

    if (params.status) {
        match.status = params.status.toLowerCase();
    }

    if (params.search) {
        match.search = params.search
    }

    if (params.date_min) {
        match.date_min = dayjs(params.date_min).format("YYYY-MM-DD");
    }

    if (params.date_max) {
        match.date_max = dayjs(params.date_max).format("YYYY-MM-DD");
    }

    const {meta, results} = await UploadModel.findAll(match, true);

    return {
        ok: true,
        data: results,
        meta: {
            page: params.page,
            limit: params.limit,
            total: meta.total
        }
    }
}

const updateUpload = async ({ user, body, params }) => {

    // Make sure user is admin
    if (!user || user?.role !== "admin") {
        throw `[401]Unathorized request`;
    }

    let schema = Joi.object({
        "status": Joi.string().valid("publish", "trash", "pending").required(),
        "url": Joi.string().uri().optional(),
        "upload_url": Joi.string().uri()
    }).options({stripUnknown: true});

    // validate the schema
    let validate = schema.validate(body);

    if(validate.error != null){
        throw `[400]${validate.error.message}`
    }

    // get the validated data
    var data = validate.value;

    // get the video
    const { results: posts } = await UploadModel.findAll({
        id: params.id
    });

    if (!posts.length) {
        throw `[400]Video was not found`;
    }

    let post = posts[0];

    if (post.status != data.status) {
        // TODO Push notifications if status is publish
        if (data.status == "publish" && post.url) {
            const queue = await getQueue();
            queue.push({
                id: post.id,
                channel: "video",
                method: "publish",
                priority: 10,
                payload: post
            })
        }
    }

    await UploadModel.update({id: params.id}, data);

    return {
        ok: true,
        message: "Upload updated successfully",
        data: {}
    }
}

const notifyUpload = async ({ body }) => {

    let schema = Joi.object({
        "url": Joi.string().uri().optional()
    }).options({stripUnknown: true});

    // validate the schema
    let validate = schema.validate(body);

    if(validate.error != null){
        throw `[400]${validate.error.message}`
    }

    // get the validated data
    var data = validate.value;

    // get the video
    const { results: posts } = await UploadModel.findAll({
        upload_url: data.url
    });

    if (!posts.length) {
        throw `[400]Video was not found`;
    }

    await UploadModel.update({id: posts[0].id}, {
        "uploaded": "yes"
    });

    return {
        ok: true,
        message: "Upload updated successfully",
        data: {}
    }
}

module.exports = {
    getUploadUrl,
    findUploads,
    updateUpload,
    notifyUpload
}