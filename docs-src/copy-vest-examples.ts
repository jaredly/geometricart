#!/usr/bin/env yarn -s esbuild --bundle --target=node12 --platform=node
/**
 * ./docs-src/copy-vest-examples.ts | node - some-fixtures.txt out-fixtures.json
 *
 * *MUST* be run from the base directory
 */

// Parse the examples, produce a .js file with them stuffed inside.
// @ts-ignore
import fs from 'fs';
import {deserializeFixtures} from '../src/vest/utils';

// @ts-ignore
const [_, __, input, output] = process.argv;

const fixtures = deserializeFixtures(fs.readFileSync(input, 'utf8'), {});
fs.writeFileSync(output, JSON.stringify(fixtures));
