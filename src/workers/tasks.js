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
            sorting: "(data ->> '$.last_attempted_at') ASC",
            limit: 100
        });

        for (let video of results ) {

            // delete presigned-url if not uploaded within 1 day
            if (
                (video.status == "new" && dayjs().diff(video.created_at, 'days') >= 2) || 
                (video.status == "trash" && dayjs().diff(video.created_at, 'minutes') >= 10)
            ) {
                video.status = "trash";
                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "veto",
                    priority: 5,
                    payload: video
                })
            } else {
                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "merge",
                    priority: 8,
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