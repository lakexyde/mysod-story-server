const dayjs = require("dayjs");
const webpush = require('../../config/webpush');

const publishStory = async (video, cb) => {

    // get the start time
    const start = dayjs();

    try {

        // if video or upload_url does not exists, return
        if (!video || !video?.url) {
            throw "Bad request";
        }

        // return if there is no user subscription
        if (!video.user || !video.user?.subscription) {
            throw "User is not subscribed";
        }

        webpush.sendNotification(
            video.user.subscription,
            JSON.stringify({
                title: "Your SOD Story Has Been Published",
                body: `Your story has recently been published. Please visit the website to download and share`,
                data: {
                    title: "Your SOD Story Has Been Published",
                    body: `Your story has recently been published. Please visit the website to download and share`,
                    url: video.url,
                    thumbnail: video.thumbnail_url
                }
            })
        )

    } catch (error) {
        console.log(error);
    } finally {
        cb()
        // log the time it took to complete the request
        const end = dayjs().diff(start, 'seconds');
        console.log("Finished in: ", end, "seconds");
    }
}

module.exports = {
    publishStory
}