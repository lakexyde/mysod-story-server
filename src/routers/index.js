const dayjs = require("dayjs");
const { getQueue } = require("../config/queue");

/**
 * 
 * @param { import("fastify").FastifyInstance } app 
 * @param {object} opts 
 * @param {Function} done 
 */
const router = (app, _, done) => {

    // base route
    app.get('/', async (_, reply) => {
        reply.send({ ok: true });
    });

    // check app health
    app.get('/health', async (_, reply) => {
        const queue = await getQueue();

        let data = {
            ok: true,
            queue: queue.getStats()
        }

        let used = process.memoryUsage();

        for (const key in used) {
            data[key] = `${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`
        }

        reply.send(data);
    });

    // add jwt token prehandler
    app.addHook('onRequest', (req, _, done) => {
        try {
            let token = req.cookies["sod.token"]; // try to get token from cookie
            // if not set, try the bearer token
            if (!token) {
                token = req.headers.authorization.substring(6).trim();
            }
            // if token found, decode the token and get user
            if (token) {
                const user = app.jwt.decode(token);
                if (user && (dayjs().valueOf() / 1000) < user.exp) {
                    req.user = user;
                }
            }
        } catch (error) {}
        done();
    })

    // register api version 1
    app.register(require('./v1'), { prefix: '/v1' });

    // call done
    done();
}

module.exports = router;