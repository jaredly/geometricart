import path from 'path';
import {
    existsSync,
    fstat,
    readdirSync,
    readFileSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from 'fs';
import {createServer, request} from 'http';
import {createServer as vite} from 'vite';

// export type Config = {
//     root: string;
//     port: number;
//     innerPort: number;
//     dirmap: {
//         [key: string]: string;
//     };
// };

export const viteFsProxy = async (config) => {
    const server = await vite({
        root: config.root,
        server: {port: config.port},
        define: {
            'process.env': {},
        },
    });
    await server.listen();

    const findMap = (url) => {
        for (let key of Object.keys(config.dirmap)) {
            if (url.startsWith(key)) {
                const rest = url.slice(key.length);
                return path.join(config.dirmap[key], rest);
            }
        }
    };

    createServer((req, res) => {
        let [url, search] = req.url?.split('?') ?? [''];
        const params = new URLSearchParams(search);
        const full = findMap(url);
        if (full) {
            if (req.method === 'GET') {
                if (!existsSync(full)) {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    return res.end('File not found');
                }
                if (statSync(full).isDirectory()) {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    return res.end(JSON.stringify(readdirSync(full)));
                }
                res.writeHead(200, {'Content-Type': 'text/plain'});
                return res.end(readFileSync(full, 'utf8'));
            }

            if (req.method === 'POST') {
                if (params.get('action') === 'delete') {
                    if (!existsSync(full)) {
                        res.writeHead(404, {
                            'Content-Type': 'text/plain',
                        });
                        return res.end('File not found');
                    }
                    unlinkSync(full);
                    res.writeHead(204);
                    return res.end();
                }
                if (params.get('action') === 'rename') {
                    const to = params.get('to');
                    if (!to) {
                        res.writeHead(400, {
                            'Content-Type': 'text/plain',
                        });
                        return res.end('Missing "to" parameter');
                    }

                    const toFull = findMap(to);
                    if (!toFull) {
                        res.writeHead(400, {'Content-Type': 'text/plain'});
                        return res.end('Invalid "to" parameter');
                    }

                    if (!existsSync(full)) {
                        res.writeHead(404, {
                            'Content-Type': 'text/plain',
                        });
                        return res.end('File not found');
                    }
                    if (existsSync(toFull)) {
                        res.writeHead(409, {
                            'Content-Type': 'text/plain',
                        });
                        return res.end('File already exists');
                    }
                    writeFileSync(toFull, readFileSync(full));
                    unlinkSync(full);
                    res.writeHead(204);
                    return res.end();
                }

                const body = [];
                req.on('data', (chunk) => {
                    body.push(chunk);
                }).on('end', () => {
                    const buffer = Buffer.concat(body).toString();
                    writeFileSync(full, buffer);
                    res.writeHead(204);
                    return res.end();
                });
                return;
            }
            res.writeHead(409, {
                'Content-Type': 'text/plain',
            });
            return res.end('Unexpected method');
        }

        const options = {
            hostname: 'localhost',
            port: config.port,
            path: req.url,
            method: req.method,
            headers: req.headers,
        };

        const proxy = request(options, function (proxy_res) {
            res.writeHead(proxy_res.statusCode, proxy_res.headers);
            proxy_res.pipe(res, {end: true});
        });

        req.pipe(proxy, {end: true});
    }).listen(config.innerPort);
    console.log(`Get it on http://localhost:${config.innerPort}`);
};
