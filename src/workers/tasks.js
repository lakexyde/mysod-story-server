const dayjs = require("dayjs");
const { UploadModel } = require("../models");
const { getQueue } = require("../config/queue");

const processPendingVideos = async () => {

    try {

        const queue = await getQueue();

        // get the videos
        const { results: uploads } = await UploadModel.findAll({
            status: "new",
            role: "admin",
            uploaded: "yes",
            sorting: "(data ->> '$.last_attempted_at') ASC",
            limit: 50
        });

        console.log("🎉 Found ", uploads.length, "items pending");

        for (let video of uploads ) {
            queue.pushTask({
                id: video.id,
                channel: "video",
                method: "merge",
                priority: 8,
                payload: video
            })
        }

        // get the videos
        const { results } = await UploadModel.findAll({
            status: "new,trash",
            role: "admin",
            sorting: "(data ->> '$.last_attempted_at') ASC",
            limit: 100
        });

        for (let video of results ) {

            // if new and more than 2 days, trash
            if (video.status == "new" && dayjs().diff(video.created_at, 'days') >= 2) {
                video.status = "trash";
                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "veto",
                    priority: 10,
                    payload: video
                })

                continue;
            }

            // if video is trash and more than 10 minutes,
            if(video.status == "trash" && dayjs().diff(video.created_at, 'minutes') >= 10) {
                video.status = "trash";
                queue.pushTask({
                    id: video.id,
                    channel: "video",
                    method: "veto",
                    priority: 5,
                    payload: video
                })

                continue;
            }

            queue.pushTask({
                id: video.id,
                channel: "video",
                method: "merge",
                priority: 9,
                payload: video
            })
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    processPendingVideos
}