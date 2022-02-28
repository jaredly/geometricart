import { Config, Fixture } from './types';

export const findFixtureDivider = (chunks: Array<string>) => {
    let divider = '===';
    while (chunks.some((c) => c.includes(divider))) {
        divider += '=';
    }
    return divider;
};

export const findDivider = (chunks: Array<string>) => {
    let divider = '---';
    while (chunks.some((c) => c.includes(divider))) {
        divider += '-';
    }
    return divider;
};

export const serializeFixtures = <I, O>(
    fixtures: Array<Fixture<I, O>>,
    serde: Config<I, O>['serde'],
) => {
    const chunks = fixtures.map((f) => serializeFixture(f, serde));
    const divider = findFixtureDivider(chunks);
    return divider + '\n' + chunks.join(`\n${divider}\n`);
};

export const deserializeFixtures = <I, O>(
    raw: string,
    serde: Config<I, O>['serde'],
) => {
    const chunks = parseDivider(raw);
    return chunks.map((chunk) => deserializeFixture(chunk, serde));
};

export const parseDivider = (raw: string) => {
    const first = raw.indexOf('\n');
    const divider = raw.slice(0, first);
    const parts = raw.slice(first + 1).split(`\n${divider}\n`);
    return parts;
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
    serde: Config<I, O>['serde'],
): Fixture<I, O> => {
    const parts = parseDivider(raw);
    const [name, passing, input, output, options] = parts;
    return {
        name,
        isPassing: passing === 'pass',
        options: options ? JSON.parse(options) : undefined,
        input: serde?.input?.deserialize(input) ?? JSON.parse(input),
        output: serde?.output?.deserialize(output) ?? JSON.parse(output),
    };
};
