const fs_extra = require('fs-extra');
const os = require('os');
const path = require('path');

const Database = require('better-sqlite3');
const config = require('.');

/** @type { import('better-sqlite3').Database } */
let _db;

const getDB = async () => {
    if (_db) return _db;

    const dirPath = path.join(config.appDataPath.replace('~', os.homedir()), 'databases');
    await fs_extra.ensureDir(dirPath);

    // initialize database
    _db = new Database(dirPath + "/app.db");
    initialize(_db);
    return _db;
}

/**
 * 
 * @param { import('better-sqlite3').Database } db 
 */
function initialize(db) {
    // enebale WAL
    db.pragma('journal_mode = WAL');

    db.function('regexp', (x, y) => {
        x ||= "";
        let match = y.match(new RegExp('^/(.*?)/([gimy]*)$'));
        return x.match(new RegExp(match[1], match[2])) ? 1 : 'null'
    });

    db.transaction((stmts, accounts) => {
        // run the statements
        for (let index = 0; index < stmts.length; index++) {
            let item = stmts[index];
    
            db.prepare(`
                CREATE TABLE IF NOT EXISTS ${item.name} (
                id VARCHAR PRIMARY KEY,
                data TEXT NOT NULL
            )`).run();
        
            db.prepare(`
                create unique index if not exists ${item.index}_unique_index on ${item.name} (id)
            `).run()
        }

        // clear tasks
        db.prepare(`
            DELETE from tasks;
        `).run()

    })(sqlStmts, [])
}

module.exports = {
    getDB
}

const sqlStmts = [
    {name: "uploads", index: "upload"},
    {name: "tasks", index: "task"},
]