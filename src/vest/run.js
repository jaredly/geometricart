const esbuild = require('esbuild');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sane = require('sane');
const glob = require('fast-glob');

const PORT = 4463;

const cwd = process.cwd();

const pattern = ['**/*.vest.tsx', '**/*.vest.jsx'];

const watcher = sane(cwd, { glob: pattern });
watcher.on('ready', (evt) => {
    console.log('vt', evt);
});
watcher.on('add', (p, r) => {
    console.log('add', p, r);
});

const initial = glob.sync(pattern);
console.log(initial);

esbuild
    .serve(
        {},
        {
            entryPoints: [path.join(__dirname, 'run.tsx')],
            bundle: true,
            sourcemap: true,
            define: { 'process.env.NODE_ENV': '"development"' },
        },
    )
    .then((result) => {
        // The result tells us where esbuild's local server is
        const { host, port } = result;

        http.createServer((req, res) => {
            const options = {
                hostname: host,
                port: port,
                path: req.url,
                method: req.method,
                headers: req.headers,
            };

            if (req.url === '/' || req.url === '/index.html') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(fs.readFileSync('./index.html', 'utf8'));
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

            // Forward each incoming request to esbuild
            const proxyReq = http.request(options, (proxyRes) => {
                // If esbuild returns "not found", send a custom 404 page
                if (proxyRes.statusCode === 404) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>A custom 404 page</h1>');
                    return;
                }

                // Otherwise, forward the response from esbuild to the client
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
            });

            // Forward the body of the request to esbuild
            req.pipe(proxyReq, { end: true });
        }).listen(PORT);
        console.log(`Listening on http://${host}:${PORT}`);
    });
