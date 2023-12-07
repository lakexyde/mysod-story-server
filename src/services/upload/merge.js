const dayjs = require("dayjs");
const os = require('os')
var ffmpeg = require('fluent-ffmpeg');
const path = require("path");
const fs = require('fs-extra');
const { getQueue } = require("../../config/queue");
var ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

//https://grm-cyc.s3.us-east-1.amazonaws.com/5580151000829836
// https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/intro.mp4
const createStory = async ({ user, body }) => {

    getQueue().then(q => {
        q.push({
            id: "merge",
            channel: "video",
            method: "merge",
            payload: {
                id: "2343234235",
                upload_url: "/Users/lakexyde/dumps/sod/data/uploads/480.mp4",
                abort: true,
            }
        })
    })

    return {
        ok: true
    }
}

module.exports = {
    createStory
}
  
  
  