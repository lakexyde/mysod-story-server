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

const findAll = async (params = {}, count = false) => {

    let joins = "";
    let where = "";
    let sorting = "(data ->> '$.created_at') DESC";

    if (params.id) {
        where += (where ? 'AND' : '') + `(data ->> '$.id' = ${quote(params.id)})\n`;
    }

    if (params.status) {
        let s = params.status.split(",").map(e => quote(e.trim())).join(",");
        where += (where ? 'AND' : '') + `((data ->> '$.status' IN (${s})))\n`
    }

    if (params.date_min && params.date_max) {
        where += (where ? 'AND' : '') + `((data ->> '$.created_at') BETWEEN '${params.date_min}' AND '${params.date_max}')\n`;
    } else if (params.date_min) {
        where += (where ? 'AND' : '') + `((data ->> '$.created_at') > '${params.date_min}')\n`;
    } else if (params.date_max) {
        where += (where ? 'AND' : '') + `((data ->> '$.created_at') < '${params.date_max}')\n`;
    } else { }

    let stmt = `
        SELECT data FROM uploads
        ${joins}
        ${(where ? 'WHERE ' : '') + where} 
        ${sorting ? 'ORDER BY ' + sorting : ''}
        ${params.limit ? 'LIMIT ' + params.limit : ''} ${params.skip ? 'OFFSET ' + params.skip : ''}
    `.trim();

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