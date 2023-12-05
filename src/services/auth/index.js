const Joi = require('joi');
const dayjs = require('dayjs');
const config = require('../../config');

const passwordLogin = async ({ body, jwt }) => {

    let schema = Joi.object({
        "email": Joi.string().email().required(),
        "password": Joi.string().min(8).required(),
    }).options({stripUnknown: true});

    // validate the schema
    let validate = schema.validate(body);

    if(validate.error != null){
        throw `[400]${validate.error.message}`
    }

    // get the validated data
    var data = validate.value;

    if (data.email !== config.adminEmail && data.password !== config.adminPassword) {
        throw "[400]Incorrect login credentials";
    }

    let payload = {
        id : "admin",
        role: "admin",
        name: "Admin"
    }

    let token = jwt.sign(payload, {expiresIn: '30d'});

    return {
        ok: true,
        data: {
            user: {
                id: "admin",
                name: "Admin"
            }
        },
        cookies: [
            {
                key: "sod.token",
                value: token,
                options: {
                    domain: config.cookieDomains,
                    path: '/',
                    secure: config.nodeEnv !== "dev",
                    maxAge: dayjs().add(30, 'days').valueOf(),
                    httpOnly: true,
                    // sameSite: 'none',
                }
            }
        ]
    }
}

const getSession = async ({ user }) => {
    console.log(user);
    return {
        ok: true,
        data: user
    }
}

module.exports = {
    getSession,
    passwordLogin
}