const esbuild = require('esbuild');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4363;

// Start esbuild's server on a random local port
esbuild
    .serve(
        {
            servedir: __dirname,
        },
        {
            // ... your build options go here ...
            entryPoints: ['test/run.tsx'],
            bundle: true,
            define: {
                'process.env.NODE_ENV': '"development"',
            },
        },
    )
    .then((result) => {
        // The result tells us where esbuild's local server is
        const { host, port } = result;

        // Then start a proxy server on port 3000
        http.createServer((req, res) => {
            const options = {
                hostname: host,
                port: port,
                path: req.url,
                method: req.method,
                headers: req.headers,
            };

            const base = __dirname + '/cases';
            if (req.url === '/cases/') {
                if (req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(
                        JSON.stringify(
                            fs
                                .readdirSync(base)
                                .filter((name) => name.endsWith('.json'))
                                .map((name) => ({
                                    name,
                                    data: JSON.parse(
                                        fs.readFileSync(path.join(base, name)),
                                    ),
                                })),
                        ),
                    );
                } else if (req.method === 'POST') {
                    let data = '';
                    req.on('data', (chunk) => {
                        data += chunk.toString('utf8');
                    });
                    req.on('end', () => {
                        const parsed = JSON.parse(data);

                        parsed.forEach((item) => {
                            if (!item.name.match(/^[a-zA-Z_.]+\.json$/)) {
                                throw new Error(`Invalid test case name`);
                            }
                            // TODO: Maybe come up with different formatting for the test
                            // cases, so the diffs look a little better? idk.
                            fs.writeFileSync(
                                path.join(base, item.name),
                                JSON.stringify(item.data, null, 2),
                            );
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
