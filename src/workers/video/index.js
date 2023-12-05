const { createStory } = require("./merge");
const { publishStory } = require("./publish");
const { vetoVideo } = require("./veto");

const run = (task, cb) => {
    try {
        switch (task.method) {
            case "merge": return createStory(task.payload, cb);
            case "veto": return vetoVideo(task.payload, cb);
            case "publish": return publishStory(task.payload, cb);
            default:
                break;
        }
    } catch (error) {
        cb(error);
    }
}

module.exports = {
  run  
}