const fsExtra = require('fs-extra');
const os = require('os');
const path = require('path');
const Queue = require('better-queue');
const config = require('.');
const { VideoHandler } = require('../workers');
const { getDB } = require('./db');
const { getJSON } = require('../utils/helpers');

class MyQueue extends Queue {
    pushTask(task) {
        getDB().then(db => {
            let t = db.prepare(`
                SELECT data from tasks
                WHERE id = @id
            `).get({
                id: task.id
            })

            // return if found;
            if (t) {
                t = getJSON(t);
                if (typeof t == "object" && t?.data?.method == "merge") {
                    console.log("Won't run duplicate");
                    return;
                }
            };

            // save to the database
            db.prepare(`
                INSERT INTO tasks (id, data) VALUES (@id, json(@data))
            `).run({
                id: task.id,
                data: JSON.stringify(task)
            });

            // push the task
            super.push(task);
        })
    }

    removeTask(id) {
        getDB().then(db => {
            db.prepare(`
                DELETE from tasks
                WHERE id = @id
            `).run({
                id: id
            })
        })
    }
}

/**@type {MyQueue} */
let _q;

/**
 * @returns {Promise<MyQueue>}
 */
const getQueue = async () => {
    if (_q) return _q;

    const dirPath = path.join(config.appDataPath.replace('~', os.homedir()), 'databases');
    await fsExtra.ensureDir(dirPath);

    _q = new MyQueue(fn, {
        id: 'id',
        concurrent: 1,
        maxRetries: 1,
        retryDelay: 200,
        afterProcessDelay: 500,
        // maxTimeout: 600000,
        // cancelIfRunning: true,
        store: {
            type: 'sql',
            dailet: 'sqlite',
            path: dirPath + '/queue.db'
        },
        priority(task, cb) {
            cb(null, task.priority || 1);
        },
    });

    // listen to task queue
    _q.on('task_queued', (taskId, _) => {
        console.log('Task with id: ', taskId, 'queued');
    })

    _q.on('task_finish', (taskId) => {
        _q.removeTask(taskId)
    })
}   

/**
 * 
 * @param {object} task 
 * @param {import('better-queue').ProcessFunctionCb} cb 
 */
function fn(task, cb) {
    // switch channels
    switch (task.channel) {
        case "video": return VideoHandler.run(task, cb); break;
        default: break;
    }

    // run callback if nothing
    cb(null);
}

module.exports = {
    getQueue
}