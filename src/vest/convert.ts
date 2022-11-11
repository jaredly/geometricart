#!/usr/bin/env yarn -s esbuild --bundle --target=node12 --platform=node
/**
 * ./src/vest/convert.ts | node - okfolks
 */
// @ts-ignore
import path from 'path';
// @ts-ignore
import fs from 'fs';
import { deserializeFixture, serializeFixtures } from './utils';

// @ts-ignore
const [_, __, dir] = process.argv;

// @ts-ignore
const fixtures = fs.readdirSync(dir).map((name) => {
    const full = path.join(dir, name);
    const input = fs.readFileSync(full, 'utf8');
    console.log(full);
    fs.unlinkSync(full);
    return deserializeFixture(input, undefined);
});

fs.unlinkSync(dir);
const full = serializeFixtures(fixtures, undefined);
fs.writeFileSync(dir + '.txt', full);
