const Joi = require('joi');
const config = require('../../config');
const dayjs = require('dayjs');

const registerToken = async ({ user: {}, body, jwt }) => {

    let schema = Joi.object({
        "platform": Joi.string().valid("web", "android", "ios").optional(),
        "token": Joi.alternatives(
            Joi.string(),
            Joi.object()
        ).required(),
    }).options({stripUnknown: true});

    // validate the schema
    let validate = schema.validate(body);

    if(validate.error != null){
        throw `[400]${validate.error.message}`
    }

    // get the validated data
    var data = validate.value;

    let token = jwt.sign({
        ...user,
        ...{ subscription: data.token }
    }, {
        expiresIn: '30d'
    });

    return {
        ok: true,
        data: user,
        cookies: [
            {
                key: "sod.token",
                value: token,
                options: {
                    domain: config.cookieDomains,
                    path: "/",
                    secure: !config.nodeEnv.startsWith("dev"),
                    maxAge: dayjs().add(30, 'days').valueOf(),
                    httpOnly: true
                }
            }
        ]
    }

}

module.exports = {
    registerToken
}   