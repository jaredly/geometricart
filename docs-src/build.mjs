import esbuild from 'esbuild';
import mdx from '@mdx-js/esbuild';
import babel from '@babel/core';
import generate from '@babel/generator';
import annotate, { addFunctionMeta } from './annotate-trace.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import t from '@babel/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const myFancyPlugin = {
    name: 'my-fancy',
    setup(build) {
        console.log('set');

        build.onLoad({ filter: /.*.tsx?$/ }, async (args) => {
            console.log('ok', args.path);
            let contents = await fs.promises.readFile(args.path, 'utf8');

            const rel = path.relative(path.dirname(__dirname), args.path);

            if (!contents.includes('// @trace')) {
                return {
                    contents:
                        contents +
                        '\n\n' +
                        generate.default(
                            t.program(addFunctionMeta(contents, rel)),
                        ).code,
                    loader: 'ts' + (args.path.endsWith('x') ? 'x' : ''),
                };
            }

            const found = annotate(contents, rel);
            return {
                contents: contents + '\n\n' + generate.default(found).code,
                loader: 'ts' + (args.path.endsWith('x') ? 'x' : ''),
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
