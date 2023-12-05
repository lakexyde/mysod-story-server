const errList = {}

function processErrMessage(mssg){
    // Check duplicates
    if(mssg.includes("duplicate")){
        var m = mssg.match(/\w*_1/g)
        if(m.length > 0){
            return `'${m[0].replace("_1", "")}' already exists`;
        }
        return mssg;
    }

    return mssg
}

function convertError(err){
    
    // Log err if in development mode
    if(["development", "local", "dev"].includes(process.env.NODE_ENV)){
        console.log(err)
    }
    
    if(typeof err == "object"){
        console.log("🐞 The Error: ", err);


        // check if message
        if(err.isJoi){
            if(err.details && err.details.length > 0){
                return {msg: err.details[0].message, code: 400}
            } else {
                return {msg: "Invalid parameters", code: 400}
            }
        }

        // if error.message
        if(err.message){
            var mssg = processErrMessage(err.message)
            return {msg: mssg}
        }

        return {msg: err}
        
    } else if(typeof err == "string"){
        var f5 = err.substring(0, 5)
        if(f5.startsWith("[") && f5.endsWith("]")){
            return {msg: err.substring(5).trim(), code: Number(f5.substring(1, 4))}
        }
        return {msg: err}
    } else {
        return {msg: err || "An unknown error occured", code: 500}
    }
}


function withData(res, data) {
    if (data?.cookies && typeof data.cookies == 'object' && Array.isArray(data.cookies)) {
        for (let i = 0; i < data.cookies.length; i++) {
            const ck = data.cookies[i];
            res.setCookie(ck.key, ck.value, ck.options);
        }

        delete data.cookies;
    }
    return res.send(data);
}

function withError(res, mssg, status = 500){
    var err = convertError(mssg)

    // try get a meaningful message
    Object.entries(errList).forEach(e => {
        const [k, v] = e;
        if (err.msg.includes(k)) {
            err.msg = v;
        }
    })

    // return response
    return res.status(err.code || status).send({
        message: err.msg
    });
}

module.exports = {
    withError,
    withData
}