const dayjs = require("dayjs");
const { UploadModel } = require("../models");
const { getQueue, getVideoQueue } = require("../config/queue");

const processPendingVideos = async () => {

    try {

        const videoQueue = await getVideoQueue()

        // get the videos
        const { results: uploads, meta } = await UploadModel.findAll({
            status: "new",
            role: "admin",
            // uploaded: "yes",
            sorting: "(data ->> '$.created_at') ASC",
            limit: 5
        }, true);

        console.log("🎉 Found ", meta.total, "items pending");

        for (let video of uploads ) {
            videoQueue.pushTask({
                id: video.id,
                channel: "video",
                method: "merge",
                // priority: 8,
                payload: video
            }, 'merge')
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

            if (video.status == "new") {
                
                video.status = "check";

                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "veto",
                    priority: 8,
                    payload: video
                }, 'veto')

                continue;
            }

            // if new and more than 2 days, trash
            queue.pushTask({
                id: video.id,
                channel: "video",
                method: "veto",
                priority: 10,
                payload: video
            }, 'veto')
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    processPendingVideos,
    cleanupVideos
}