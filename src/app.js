const Fastify = require('fastify');
const config = require('./config');
const { getQueue, getVideoQueue } = require('./config/queue');
const { getDB } = require('./config/db');
const { AsyncTask, SimpleIntervalJob } = require('toad-scheduler');
const { fastifySchedulePlugin } = require('@fastify/schedule');
const { processPendingVideos, cleanupVideos } = require('./workers/tasks');

class SODApp {

    /**@type {import('fastify').FastifyInstance} */
    app;

    constructor() {
        this.app = Fastify({
            requestTimeout: 30000
        })
    }

    async registerPlugins() {

        // register middie
        await this.app.register(require('@fastify/middie'));
        
        // register jwt
        await this.app.register(require('@fastify/jwt'),  {
            secret: config.jwtKey,
            cookie: {
                cookieName: 'sod.token',
                signed: true
            }
        })

        // register cookie
        await this.app.register(require('@fastify/cookie'), {
            secret: config.jwtKey
        })

        // register cors
        this.app.use(require('cors')({
            origin: config.corsOrigins,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            optionsSuccessStatus: 200,
            credentials: true
        }))

        // register scheduler
        this.app.register(fastifySchedulePlugin);
        
    }

    async start() {
        // register plugins
        await this.registerPlugins();

        // set not found handler
        // TODO add rate limit
        this.app.setNotFoundHandler((req, reply) => {
            reply.status(404).send({ok: false, message: "Not Found"});
        });

        // add the plugin to the request
        this.app.addHook('preHandler', (req, _, done) => {
            req.jwt = this.app.jwt;
            done();
        });

        // register api routes
        this.app.register(require('./routers'));

        // run the app ready callback
        this.app.ready(async (error) => {
            if (error) throw error;

            // initialize queue
            await getQueue();
            await getVideoQueue();

            // initialize database
            await getDB()

            // run tasks
            this.runTasks();
        });

        const host = ("RENDER" in process.env) ? `0.0.0.0` : 'localhost';

        // listen on port
        this.app.listen({ port: config.port, host }, (err, address) => {

            if (err) {
                this.app.log.error(err);
                return;
            }

            this.app.log.info(`🎉 SOD App running on ${address}`);
        })
    }

    runTasks() {
        const pendingUploadTasks = new AsyncTask(
            "pending-upload-task",
            () => { return processPendingVideos() }
        )

        const cleanupVideosTasks = new AsyncTask(
            "cleanup-videos-task",
            () => { return cleanupVideos() }
        )

        // add the job
        this.app.scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 60 }, pendingUploadTasks))

        this.app.scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 120 }, cleanupVideosTasks))
    }
}

module.exports = new SODApp();