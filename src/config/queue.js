const fsExtra = require('fs-extra');
const os = require('os');
const path = require('path');
const Queue = require('better-queue');
const config = require('.');
const { VideoHandler } = require('../workers');

/**@type {import('better-queue')} */
let _q;

/**
 * @returns {Promise<Queue>}
 */
const getQueue = async () => {
    if (_q) return _q;

    const dirPath = path.join(config.appDataPath.replace('~', os.homedir()), 'databases');
    await fsExtra.ensureDir(dirPath);

    _q = new Queue(fn, {
        id: 'id',
        concurrent: 1,
        maxRetries: 1,
        retryDelay: 30000,
        // maxTimeout: 600000,
        cancelIfRunning: false,
        store: {
            type: 'sql',
            dailet: 'sqlite',
            path: dirPath + '/queue.db'
        },
        priority(task, cb) {
            cb(null, task.priority || 1);
        }
    });

    // listen to task queue
    _q.on('task_queued', (taskId, _) => {
        console.log('Task with id: ', taskId, 'started');
    })
}   

/**
 * 
 * @param {object} arg 
 * @param {import('better-queue').ProcessFunctionCb} cb 
 */
function fn(arg, cb) {

    // switch channels
    switch (arg.channel) {
        case "video": VideoHandler.run(arg, cb); break;
        default: break;
    }

    // run callback if nothing
    cb();
}

module.exports = {
    getQueue
}