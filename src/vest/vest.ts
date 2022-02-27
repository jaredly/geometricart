/**
 * Visual tests
 *
 * or something. Keeps you warm when it's cold. Looks fashion.
 */

import path from 'path';
import fs from 'fs';
import { Config } from './types';

const vests: Array<Config<unknown, unknown>> = [];
const suffix = '.input.txt';

export class IncompleteFixture extends Error {}

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
                    const expected = base + '.expected.txt';
                    if (!fs.existsSync(path.join(dir, expected))) {
                        throw new IncompleteFixture(
                            `No .expected.txt found for fixture ${name}`,
                        );
                    }
                    const raw = fs.readFileSync(
                        path.join(dir, expected),
                        'utf8',
                    );
                    const expectedValue: O =
                        config.serde?.output?.deserialize(raw) ??
                        JSON.parse(raw);
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

export const register = <I, O>(config: Config<I, O>) => {
    if (typeof jest !== undefined) {
        jestTests(config);
    } else {
        vests.push(config as Config<unknown, unknown>);
    }
};
