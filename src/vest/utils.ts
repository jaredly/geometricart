import { Config, Fixture } from './types';

export const findDivider = (chunks: Array<string>) => {
    let divider = '---';
    while (chunks.some((c) => c.includes(divider))) {
        divider += '-';
    }
    return divider;
};

export const serializeFixture = <I, O>(
    fixture: Fixture<I, O>,
    serde: Config<I, O>['serde'],
) => {
    const parts = [
        fixture.name,
        fixture.isPassing ? 'pass' : 'fail',
        serde?.input?.serialize(fixture.input) ??
            JSON.stringify(fixture.input, null, 2),
        serde?.output?.serialize(fixture.output) ??
            JSON.stringify(fixture.output, null, 2),
    ];
    if (fixture.options) {
        parts.push(JSON.stringify(fixture.options));
    }
    const divider = findDivider(parts);
    return divider + '\n' + parts.join(`\n${divider}\n`);
};

export const deserializeFixture = <I, O>(
    raw: string,
    config: Config<I, O>,
): Fixture<I, O> => {
    const first = raw.indexOf('\n');
    const divider = raw.slice(0, first);
    const parts = raw.slice(first + 1).split(`\n${divider}\n`);
    const [name, passing, input, output, options] = parts;
    return {
        name,
        isPassing: passing === 'pass',
        options: options ? JSON.parse(options) : undefined,
        input: config.serde?.input?.deserialize(input) ?? JSON.parse(input),
        output: config.serde?.output?.deserialize(output) ?? JSON.parse(output),
    };
};
