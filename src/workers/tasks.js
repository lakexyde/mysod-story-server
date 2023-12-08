const dayjs = require("dayjs");
const { UploadModel } = require("../models");
const { getQueue, getVideoQueue } = require("../config/queue");
const { getDB } = require("../config/db");

const processPendingVideos = async () => {

    try {

        const queue = await getQueue();
        const videoQueue = await getVideoQueue()

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
            videoQueue.pushTask({
                id: video.id,
                channel: "video",
                method: "merge",
                priority: 8,
                payload: video
            })
        }

        const db = await getDB();

        // delete trash more than 10 minutes
        db.prepare(`
            DELETE FROM uploads
            WHERE (data ->> '$.status' = 'trash') 
                AND (data ->> '$.updated_at' > '${dayjs().subtract(30, 'minutes').toISOString()}')
        `).run()

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

            videoQueue.pushTask({
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