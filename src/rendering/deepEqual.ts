import equal from 'fast-deep-equal';

const SIZE = 10000;

export const deepRoundFloats = (value: unknown): unknown => {
    if (!value) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(deepRoundFloats);
    }
    if (typeof value === 'object') {
        const mapped: { [key: string]: unknown } = {};
        Object.keys(value).forEach(
            (k) => (mapped[k] = deepRoundFloats((value as any)[k])),
        );
        return mapped;
    }
    if (typeof value === 'number') {
        return Math.round(value * SIZE) / SIZE;
    }
    return value;
};

/**
 * Float munging deep equal
 */
export const deepEqual = (one: unknown, two: unknown) => {
    console.log('checking');
    return equal(deepRoundFloats(one), deepRoundFloats(two));
};
