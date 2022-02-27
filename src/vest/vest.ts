/**
 * Visual tests
 *
 * or something. Keeps you warm when it's cold. Looks fashion.
 */

import path from 'path';
import fs from 'fs';
import { Config } from './types';
import { run } from './App';

// const vests: Array<Config<unknown, unknown>> = [];
const suffix = '.input.txt';

export class IncompleteFixture extends Error {}

export const parseOutput = (raw: string): [string, boolean] => {
    const firstLine = raw.indexOf('\n');
    return [raw.slice(firstLine + 1), raw.slice(0, firstLine) === 'pass'];
};

export const jestTests = <I, O>(config: Config<I, O>) => {
    describe(`Vest ${config.id}`, () => {
        const dir = path.join(config.dir, '__vest__', config.id);
        const files = fs.readdirSync(dir);

        files
            .filter((f) => f.endsWith(suffix))
            .forEach((name) => {
                // Hmm maybe incomplete fixtures are just skips?
                // no not really.
                it(`Fixture ${name}`, () => {
                    const base = name.slice(0, -suffix.length);
                    const outputPath = base + '.output.txt';
                    const raw = fs.readFileSync(
                        path.join(dir, outputPath),
                        'utf8',
                    );
                    const [rawOutput, isPassing] = parseOutput(raw);
                    if (!isPassing) {
                        throw new IncompleteFixture(
                            `No passing output for ${base}`,
                        );
                    }
                    const expectedValue: O =
                        config.serde?.output?.deserialize(rawOutput) ??
                        JSON.parse(rawOutput);
                    const rawInput = fs.readFileSync(
                        path.join(dir, name),
                        'utf8',
                    );
                    const input: I =
                        config.serde?.input?.deserialize(rawInput) ??
                        JSON.parse(rawInput);
                    const output: O = config.transform(input);
                    expect(output).toEqual(expectedValue);
                });
            });
    });
};

export const vestUI = <I, O>(config: Config<I, O>) => {
    run(config as Config<unknown, unknown>);
};

export const register = <I, O>(config: Config<I, O>) => {
    if (typeof jest !== 'undefined') {
        jestTests(config);
    } else {
        // vests.push(config as Config<unknown, unknown>);
        // OK GO GO GO let's react-dom it up I think???
        vestUI(config);
    }
};
