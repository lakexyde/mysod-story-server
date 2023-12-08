const dayjs = require("dayjs");
const { UploadModel } = require("../models");
const { getQueue, getVideoQueue } = require("../config/queue");

const processPendingVideos = async () => {

    try {

        const queue = await getQueue();
        const videoQueue = await getVideoQueue()

        // get the videos
        const { results: uploads } = await UploadModel.findAll({
            status: "new",
            role: "admin",
            // uploaded: "yes",
            sorting: "(data ->> '$.last_attempted_at') ASC, (data ->> '$.updated_at') ASC",
            limit: 50
        });

        console.log("🎉 Found ", uploads.length, "items pending");

        for (let video of uploads ) {
            videoQueue.pushTask({
                id: video.id,
                channel: "video",
                method: "merge",
                priority: 8,
                payload: video
            })
        }

    } catch (error) {
        console.log(error);
    }
}

const cleanupVideos = async () => {

    try {

        const queue = await getQueue();

        // get the videos
        const { results } = await UploadModel.findAll({
            status: "trash",
            role: "admin",
            limit: 100
        });

        for (let video of results ) {

            // if new and more than 2 days, trash
            queue.pushTask({
                id: video.id,
                channel: "video",
                method: "veto",
                priority: 10,
                payload: video
            })
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    processPendingVideos,
    cleanupVideos
}