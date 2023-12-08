'use strict'

require('dotenv').config();

const app = require('./src/app');
const config = require('./src/config');

// Listen for shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);

function gracefulShutdown() {
    console.log('Received shutdown signal. Gracefully shutting down...');

    config.spawnedProcesses.forEach(childProcess => {
        try {
            childProcess?.cmd?.kill();
        } catch (error) {}
    })

    // Exit the process
    process.exit(0);
}

// handle errors and prevent the app from crashing
process.on('unhandledRejection', (reason, _) => {
    console.error(reason);
});

// prevent app from crashing when an exception is not accounted for
process.on('uncaughtException', error => {
    if (error) {
        console.error(error);
    }

    console.info("Node app will not exit...");
})

// run the app
app.start();