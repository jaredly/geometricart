/**
 * Visual tests
 *
 * or something. Keeps you warm when it's cold. Looks fashion.
 */

// @ts-ignore
import path from 'path';
// @ts-ignore
import fs from 'fs';
import {Config} from './types';
import {run} from './App';
import {deserializeFixture, deserializeFixtures} from './utils';
import {deepRoundFloats} from '../rendering/deepEqual';

export class IncompleteFixture extends Error {}

export const jestTests = <I, O>(config: Config<I, O>) => {
    // @ts-ignore
    describe(`Vest ${config.id}`, () => {
        const file = path.join(config.dir, '__vest__', config.id + '.txt');
        const raw = fs.readFileSync(file, 'utf8');
        const fixtures = deserializeFixtures(raw, config.serde);

        fixtures.forEach((fixture) => {
            // Hmm maybe incomplete fixtures are just skips?
            // no not really.
            // @ts-ignore
            it(`Fixture ${fixture.name}`, () => {
                if (!fixture.isPassing) {
                    throw new IncompleteFixture(`No passing output for ${fixture.name}`);
                }
                const output: O = config.transform(fixture.input);
                // @ts-ignore
                expect(deepRoundFloats(output)).toEqual(deepRoundFloats(fixture.output));
            });
        });
    });
};

export const vestUI = <I, O>(config: Config<I, O>) => {
    run(config as any);
};

export const register = <I, O>(config: Config<I, O>) => {
    // @ts-ignore
    if (typeof jest !== 'undefined') {
        jestTests(config);
    } else {
        // vests.push(config as Config<unknown, unknown>);
        // OK GO GO GO let's react-dom it up I think???
        vestUI(config);
    }
};
