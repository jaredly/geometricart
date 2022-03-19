import esbuild from 'esbuild';
import mdx from '@mdx-js/esbuild';
import babel from '@babel/core';
import generate from '@babel/generator';
import annotate, { addFunctionMeta } from './annotate-trace.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import t from '@babel/types';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entry = __dirname + '/run.tsx';

const walk = (dir, fn) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((value) => {
        if (value.isDirectory()) {
            walk(path.join(dir, value.name), fn);
        } else {
            fn(path.join(dir, value.name));
        }
    });
};
const getAllTSFiles = () => {
    const tsFiles = [];
    const bases = [__dirname, __dirname + '/../src', __dirname + '/../test'];
    bases.forEach((base) =>
        walk(base, (full) => {
            if (full.match(/\.tsx?$/)) {
                tsFiles.push(full);
            }
        }),
    );
    return tsFiles;
};

// for (const sourceFile of program.getSourceFiles()) {
//     if (sourceFile.text.includes('// @trace')) {
//         console.log(sourceFile.fileName);
//     }
// }

const myFancyPlugin = {
    name: 'my-fancy',
    setup(build) {
        let program; // = ts.createProgram([]);
        let checker; // = program.getTypeChecker();

        build.onStart(() => {
            const start = performance.now();
            program = ts.createProgram(
                getAllTSFiles(),
                JSON.parse(
                    fs.readFileSync(__dirname + '/../tsconfig.json', 'utf8'),
                ),
            );
            checker = program.getTypeChecker();
            console.log('Type checking took', performance.now() - start);
        });

        build.onLoad({ filter: /.*.tsx?$/ }, async (args) => {
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

            // oh I don't have to use babel here, I could just use ts
            // that would certainly be ~better perf.
            // although it might not have as nice a traverse api.
            // yeah idk.
            console.log('ok', args.path);
            const sf = program.getSourceFile(args.path);
            ts.forEachChild(sf, (node) => {
                node.kind;
            });
            console.log(!!sf, 'sf');
            const types = {};
            const walk = (node) => {
                const { line, character } = sf.getLineAndCharacterOfPosition(
                    node.pos + node.getLeadingTriviaWidth(),
                );

                const expressionKinds = [
                    79, 104, 95, 110,
                    // 6,7,8,9,63,78,87,91,93,110,120,121,123,124,141,142,14
                ];
                const exprMin = 202;
                const exprMax = 227;

                try {
                    // if (node._expressionBrand) {
                    if (
                        expressionKinds.includes(node.kind) ||
                        (node.kind >= exprMin && node.kind <= exprMax)
                    ) {
                        types[node.pos + node.getLeadingTriviaWidth()] = {
                            k: node.kind,
                            // st: node.getFullStart(),
                            // w: node.getFullWidth(),
                            text: node.getText(),
                            loc: `${line + 1}:${character}`,
                            type: checker.typeToString(
                                checker.getTypeAtLocation(node),
                            ),
                        };
                    }
                    // }
                } catch (err) {
                    console.log('nope', line, character);
                }
                node.forEachChild(walk);
            };
            ts.forEachChild(sf, walk);
            fs.writeFileSync(
                args.path + '.dump',
                JSON.stringify(types, null, 2),
            );
            const found = annotate(contents, rel);
            return {
                contents: contents + '\n\n' + generate.default(found).code,
                loader: 'ts' + (args.path.endsWith('x') ? 'x' : ''),
            };
        });
    },
};

await esbuild.build({
    entryPoints: [entry],
    // watch: true,
    sourcemap: 'inline',
    outfile: __dirname + '/build/output.js',
    // format: 'esm',
    define: {
        'process.env.NODE_ENV': '"development"',
    },
    bundle: true,
    plugins: [myFancyPlugin, mdx({ outputFormat: 'program' })],
});
