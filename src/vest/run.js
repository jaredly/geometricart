const esbuild = require('esbuild');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sane = require('sane');
const glob = require('fast-glob');

const PORT = 4463;

const cwd = process.cwd();

const pattern = ['**/*.vest.tsx', '**/*.vest.jsx'];

let waiting = [];
const trigger = () => {
    const w = waiting;
    waiting = [];
    w.forEach((fn) => fn());
};

// TODO: set up a websocket connection probably.
// Or just long polling? tbh that would work fine too.
// const watcher = sane(cwd, { glob: pattern });
// watcher.on('add', (p, r) => trigger());
// watcher.on('remove', (p, r) => trigger());

const initial = glob.sync(pattern, { onlyFiles: true });
console.log(initial);

esbuild
    .serve(
        {},
        {
            entryPoints: [path.join(__dirname, 'run.tsx')].concat(
                initial.map((m, i) => path.join(cwd, m)),
            ),
            outbase: cwd,
            entryNames: '[dir]/[name]',
            bundle: true,
            sourcemap: true,
            define: {
                'process.env.NODE_ENV': '"development"',
                __dirname: '"/spoofed/__dirname"',
            },
            external: ['path', 'fs'],
        },
    )
    .then((result) => {
        // The result tells us where esbuild's local server is
        const { host, port } = result;
        const proxy = makeProxy(host, port);

        http.createServer((req, res) => {
            if (req.url === '/' || req.url === '/index.html') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(
                    fs.readFileSync(__dirname + '/index.html', 'utf8'),
                );
            }

            if (req.url === '/run.js') {
                const rel = path.relative(cwd, path.join(__dirname, 'run.js'));
                console.log(rel);
                return proxy(req, res, '/' + rel);
            }

            if (req.url === '/vests') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(initial));
            }

            const [pathpart, search] = req.url.split('?');

            if (initial.includes(pathpart.slice(1))) {
                if (search) {
                    const dir = path.join(
                        path.dirname(pathpart.slice(1)),
                        '__vest__',
                    );
                    const filePath = path.join(dir, search + '.txt');
                    if (req.method === 'POST') {
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }

                        return getBody(req).then((data) => {
                            fs.writeFileSync(filePath, data);
                        });
                    }
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    if (fs.existsSync(filePath)) {
                        const fixtures = fs.readFileSync(filePath, 'utf8');
                        return res.end(fixtures);
                    } else {
                        return res.end('');
                    }
                }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(
                    fs
                        .readFileSync(__dirname + '/index.html', 'utf8')
                        .replace(
                            '"run.js"',
                            `"${pathpart.replace(/\.[jt]sx?$/, '.js')}"`,
                        ),
                );
            }

            proxy(req, res);
        }).listen(PORT);
        console.log(`Listening on http://${host}:${PORT}`);
    });

const makeProxy = (host, port) => (req, res, customPath) => {
    const options = {
        hostname: host,
        port: port,
        path: customPath || req.url,
        method: req.method,
        headers: req.headers,
    };

    // Forward each incoming request to esbuild
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    // Forward the body of the request to esbuild
    req.pipe(proxyReq, { end: true });
};

const getBody = (req) => {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk.toString('utf8');
        });
        req.on('end', () => {
            resolve(data);
        });
        req.on('error', (err) => {
            reject(err);
        });
    });
};
