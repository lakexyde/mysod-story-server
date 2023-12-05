const dayjs = require("dayjs");
const { UploadModel } = require("../models");
const { getQueue } = require("../config/queue");

const processPendingVideos = async () => {

    try {

        const queue = await getQueue();

        // get the videos
        const { results } = await UploadModel.findAll({
            status: "new,trash",
            limit: 50
        });

        for (let video of results ) {

            // if video is new but more than 7 days, disapprove
            if (["new", "trash"].includes(video.status) && dayjs().diff(video.created_at, 'days') >= 7) {
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