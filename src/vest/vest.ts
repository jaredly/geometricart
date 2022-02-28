/**
 * Visual tests
 *
 * or something. Keeps you warm when it's cold. Looks fashion.
 */

import path from 'path';
import fs from 'fs';
import { Config } from './types';
import { run } from './App';
import { deserializeFixture } from './utils';

export class IncompleteFixture extends Error {}

export const jestTests = <I, O>(config: Config<I, O>) => {
    describe(`Vest ${config.id}`, () => {
        const dir = path.join(config.dir, '__vest__', config.id);
        const files = fs.readdirSync(dir);

        files.forEach((name) => {
            // Hmm maybe incomplete fixtures are just skips?
            // no not really.
            it(`Fixture ${name}`, () => {
                const fixture = deserializeFixture(
                    fs.readFileSync(path.join(dir, name), 'utf8'),
                    config,
                );
                if (!fixture.isPassing) {
                    throw new IncompleteFixture(
                        `No passing output for ${fixture.name}`,
                    );
                }
                const output: O = config.transform(fixture.input);
                expect(output).toEqual(fixture.output);
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
