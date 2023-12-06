const dayjs = require("dayjs");
const { UploadModel } = require("../models");
const { getQueue } = require("../config/queue");

const processPendingVideos = async () => {

    try {

        const queue = await getQueue();

        // get the videos
        const { results } = await UploadModel.findAll({
            status: "new,trash",
            role: "admin",
            limit: 50
        });

        for (let video of results ) {

            // delete presigned-url if not uploaded within 1 day
            if (
                (video.status == "new" && dayjs().diff(video.created_at, 'days') >= 1) || 
                (video.status == "trash" && dayjs().diff(video.created_at, 'days') >= 7)
            ) {
                video.status = "trash";
                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "veto",
                    payload: video
                })
            } else {
                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "merge",
                    payload: video
                })
            }  
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    processPendingVideos
}