import {closeEnough} from '../rendering/epsilonToZero';

export function findCommonFractions(value: number) {
    if (closeEnough(value, Math.round(value))) {
        return {num: Math.round(value), denom: 1, err: 0};
    }
    const whole = Math.floor(value);
    if (value === whole) {
        return {num: whole, denom: 1, err: 0};
    }
    let best = undefined as undefined | {num: number; denom: number; err: number};
    const decimal = value - whole;
    for (let num = 1; num < 100; num++) {
        for (let denom = 2; denom < 100; denom++) {
            const err = Math.abs(num / denom - decimal);
            if (err < 0.001 && (!best || err < best.err)) {
                best = {num: num + whole * denom, denom, err};
            }
        }
    }
    return best;
}

const nums = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const denoms = '₀₁₂₃₄₅₆₇₈₉';
const slash = '⁄';
const getNumber = (n: number, digits: string) => {
    let res = '';
    while (n > 0) {
        const out = Math.floor(n / 10);
        res = digits[n - out * 10] + res;
        n = out;
    }
    return res;
};

export const showFract = (fract: {num: number; denom: number}) => {
    if (fract.denom === 1) return fract.num.toString();
    const whole = Math.floor(fract.num / fract.denom);
    if (whole) {
        return `${whole} ${getNumber(fract.num - whole * fract.denom, nums)}${slash}${getNumber(fract.denom, denoms)}`;
    }
    return `${getNumber(fract.num, nums)}${slash}${getNumber(fract.denom, denoms)}`;
};

export const humanReadableFraction = (value: number) => {
    if (closeEnough(Math.round(value), value, 0.001)) return Math.round(value) + '';
    const fract = findCommonFractions(value);
    if (fract) {
        return showFract(fract);
    }
    const pifract = findCommonFractions(value / Math.PI);
    if (pifract) {
        return showFract(pifract) + `π`;
    }
    return value.toFixed(4);
};
