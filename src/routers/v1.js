const { UploadController, NotificationController, AuthController } = require("../controllers");

/**
 * 
 * @param { import("fastify").FastifyInstance } app 
 * @param {object} opts 
 * @param {Function} done 
 */
const router = (app, _, done) => {

    app.get("/auth/session", AuthController.getSession);
    app.post("/auth/login", AuthController.passwordLogin);
    app.post("/auth/logout", AuthController.postLogout);

    // get a signed url
    app.get("/posts", UploadController.getUploads);
    app.post("/posts/generate-url", UploadController.postGetSignedUrl);
    app.post("/posts/notify", UploadController.postNotifyUpload);
    app.post("/posts/story", UploadController.postCreateStory);
    app.put("/posts/:id", UploadController.putUpload);

    // notifications
    app.post("/notifications/token", NotificationController.postRegisterToken);

    // call done to avoid wahala
    done();
}

module.exports = router;