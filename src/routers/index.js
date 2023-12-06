const dayjs = require("dayjs");
const { getQueue } = require("../config/queue");

function getFileName(urlOrPath) {
    if (typeof urlOrPath !== 'string') {
      throw new Error('Invalid input: Expected a string');
    }
  
    const url = new URL(urlOrPath);
    const path = url.pathname;
    const lastSlashIndex = path.lastIndexOf('/');
  
    if (lastSlashIndex === -1) {
      return path;
    } else {
      return path.substring(lastSlashIndex + 1);
    }
  }

/**
 * 
 * @param { import("fastify").FastifyInstance } app 
 * @param {object} opts 
 * @param {Function} done 
 */
const router = (app, _, done) => {

    // base route
    app.get('/', async (_, reply) => {
        reply.send({ ok: true, data: getFileName("https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/posts/sod-story/dumps/6575185868834356.mp4") });
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