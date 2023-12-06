const dayjs = require("dayjs");
const { getDB } = require("../config/db");
const { genId } = require("../utils/gen");
const { quote, getJSON } = require("../utils/helpers");

// "new", "pending", "active"
// visibility: "visible"

const initialize = async (data) => {
    data.id = genId();
    data.status = "new";

    // generate timsestamps
    data.created_at = dayjs().toISOString();
    data.updated_at = dayjs().toISOString();

    // get the database instance
    const db = await getDB();

    db.prepare(`
        INSERT INTO uploads (id, data) VALUES (@id, json(@data))
    `).run({
        id: data.id,
        data: JSON.stringify(data)
    });
}

const update = async (params = {}, data) => {

    let where = "";

    if (params.id) {
        where += (where ? 'AND' : '') + `(data ->> '$.id' = ${quote(params.id)})\n`;
    }

    // generate update timestamps
    data.updated_at = dayjs().toISOString();

    // get the database instance
    const db = await getDB();

    db.prepare(`
        UPDATE uploads
        SET data = json_patch(data, json(@data))
        ${where ? 'WHERE ' + where : ''}
    `).run({
        data: JSON.stringify(data)
    });

    return data;
}

const findAll = async (params = {role: "admin"}, count = false) => {

    let joins = "";
    let where = "";
    let sorting = params.sorting || "(data ->> '$.created_at') DESC";

    let fields = {
        "id": "json_extract(data, '$.id')",
        "url": "json_extract(data, '$.url')",
        "thumbnail_url": "json_extract(data, '$.thumbnail_url')",
        "upload_url": "json_extract(data, '$.upload_url')",
        "sender": "json_extract(data, '$.sender')",
        "user": "json_extract(data, '$.user')",
        "status": "json_extract(data, '$.status')",
        "created_at": "json_extract(data, '$.created_at')",
        "updated_at": "json_extract(data, '$.updated_at')",
    }

    if (params.id) {
        where += (where ? 'AND' : '') + `(data ->> '$.id' = ${quote(params.id)})\n`;
    }

    if (params.status) {
        let s = params.status.split(",").map(e => quote(e.trim())).join(",");
        where += (where ? 'AND' : '') + `((data ->> '$.status' IN (${s})))\n`
    }

    if (params.search) {
        where += (where ? 'AND' : '') + `(
            regexp(data ->> '$.id', '/${params.search}/gi') 
            OR regexp(data ->> '$.sender.name', '/${params.search}/gi')
            OR regexp(data ->> '$.url', '/${params.search}/gi')
        )\n`;
    }

    if (params.date_min && params.date_max) {
        where += (where ? 'AND' : '') + `((data ->> '$.created_at') BETWEEN '${params.date_min}' AND '${params.date_max}')\n`;
    } else if (params.date_min) {
        where += (where ? 'AND' : '') + `((data ->> '$.created_at') > '${params.date_min}')\n`;
    } else if (params.date_max) {
        where += (where ? 'AND' : '') + `((data ->> '$.created_at') < '${params.date_max}')\n`;
    } else { }

    let stmt = `
        SELECT @fields@  FROM uploads
        ${joins}
        ${(where ? 'WHERE ' : '') + where} 
        ${sorting ? 'ORDER BY ' + sorting : ''}
        ${params.limit ? 'LIMIT ' + params.limit : ''} ${params.skip ? 'OFFSET ' + params.skip : ''}
    `.trim();

    // remove keys if not admin
    if (params.role != "admin") {
        delete fields["upload_url"];
        delete fields["user"];
    }

    stmt = stmt.replace('@fields@', Object.entries(fields).map(e => `${e[1]} AS ${e[0]}`).join(', '));

    const db = await getDB();
    const results = db.prepare(stmt).all().map(e => getJSON(e.data || e));

    return {
        results,
        meta: count ? db.prepare(`
             SELECT COUNT(DISTINCT id) as total FROM uploads
             ${where ? 'WHERE ' + where : ''}
         `).get() : null
    }

}

const remove = async (id) => {

    // get the database instance
    const db = await getDB();

    db.prepare(`
        DELETE FROM uploads
        WHERE data ->> '$.id' = @id
    `).run({
        id: id
    });

    return true;
}

module.exports = {
    initialize,
    findAll,
    update,
    remove
}