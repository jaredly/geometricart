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
        // { servedir: __dirname },
        {},
        {
            entryPoints: [path.join(__dirname, 'run.tsx')].concat(
                initial.map((m, i) => path.join(cwd, m)),
            ),
            outbase: cwd,
            entryNames: '[dir]/[name]',
            // outdir: 'out',
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
                    const fixtures = getFixtures(pathpart, search);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify(fixtures));
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

            const base = path.join(__dirname, 'cases');
            if (req.url === '/cases/') {
                if (req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(
                        JSON.stringify(
                            fs
                                .readdirSync(base)
                                .filter((name) => name.endsWith('.json'))
                                .map((name) =>
                                    JSON.parse(
                                        fs.readFileSync(path.join(base, name)),
                                    ),
                                )
                                .sort((a, b) => a.id - b.id),
                        ),
                    );
                } else if (req.method === 'POST') {
                    let data = '';
                    req.on('data', (chunk) => {
                        data += chunk.toString('utf8');
                    });
                    req.on('end', () => {
                        const parsed = JSON.parse(data);

                        let unused = {};

                        parsed.forEach((item) => {
                            const fileName = `${item.id}-${item.title.replace(
                                /[^a-zA-Z0-9_.-]/g,
                                '-',
                            )}.json`;
                            unused[fileName] = false;
                            // TODO: Maybe come up with different formatting for the test
                            // cases, so the diffs look a little better? idk.
                            fs.writeFileSync(
                                path.join(base, fileName),
                                JSON.stringify(item, null, 2),
                            );
                        });

                        // Remove deleted ones
                        Object.keys(unused).forEach((k) => {
                            if (unused[k]) {
                                fs.unlinkSync(path.join(base, k));
                            }
                        });

                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                        });
                        res.end('Ok');
                    });
                }
                return;
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

const suffix = '.input.txt';

const getFixtures = (sourceFile, id) => {
    const dir = path.join(path.dirname(sourceFile), '__vest__', id);
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs
        .readdirSync(dir)
        .filter((name) => name.filter(name.endsWith(suffix)))
        .map((name) => {
            const base = name.slice(0, -suffix.length);
            const rawInput = fs.readFileSync(path.join(dir, name), 'utf8');
            const output = base + '.output.txt';
            const outputRaw = fs.readFileSync(path.join(dir, output), 'utf8');
            return { name: base, input: rawInput, output: outputRaw };
        });
};
