'use strict'

require('dotenv').config();

const app = require('./src/app');

// handle errors and prevent the app from crashing
process.on('unhandledRejection', (reason, _) => {
    console.error(reason);
});

// prevent app from crashing when an exception is not accounted for
process.on('uncaughtException',  error => {
    if (error) {
        console.error(error);
    }

    console.info("Node app will not exit...");
})

// run the app
app.start();