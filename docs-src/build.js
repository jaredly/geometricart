import esbuild from 'esbuild';
import mdx from '@mdx-js/esbuild';

await esbuild.build({
    entryPoints: [__dirname + '/index.mdx'],
    outfile: __dirname + '/output.js',
    format: 'esm',
    plugins: [
        mdx({
            /* jsxImportSource: …, otherOptions… */
        }),
    ],
});
