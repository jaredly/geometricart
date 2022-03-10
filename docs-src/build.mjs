import esbuild from 'esbuild';
import mdx from '@mdx-js/esbuild';
import babel from '@babel/core';
import generate from '@babel/generator';
import annotate from './annotate-trace.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const myFancyPlugin = {
    name: 'my-fancy',
    setup(build) {
        console.log('set');

        build.onLoad({ filter: /.*.ts$/ }, async (args) => {
            console.log('ok', args.path);
            let contents = await fs.promises.readFile(args.path, 'utf8');

            if (!contents.includes('// @trace')) {
                return {
                    contents,
                    loader: 'ts',
                };
            }

            const found = annotate(contents);
            console.log(found);
            return {
                contents: contents + '\n\n' + generate.default(found).code,
                loader: 'ts',
            };
        });
    },
};

await esbuild.build({
    entryPoints: [__dirname + '/run.tsx'],
    watch: true,
    outfile: __dirname + '/output.js',
    format: 'esm',
    define: {
        'process.env.NODE_ENV': '"development"',
    },
    bundle: true,
    plugins: [myFancyPlugin, mdx({ outputFormat: 'program' })],
});
