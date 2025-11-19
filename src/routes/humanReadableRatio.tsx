import {closeEnough} from '../rendering/epsilonToZero';
import {findCommonFractions} from './findCommonFractions';

export const humanReadableRatio = (left: number, right: number): {left: string; right: string} => {
    const value = left / right;
    console.log(`hrr`, left, right, value);
    if (closeEnough(Math.round(value), value, 0.001))
        return {left: `${Math.round(value)}`, right: '1'};
    const roots = [
        {value: 1, text: ''},
        {value: Math.PI, text: 'π'},
        {value: Math.sqrt(2), text: '√2'},
        {value: Math.sqrt(3), text: '√3'},
    ];
    const options: {err: number; left: string; right: string}[] = [];
    roots.forEach((root) => {
        const fract = findCommonFractions(value / root.value);
        if (fract) {
            options.push({
                err: fract.err,
                left: `${fract.denom}`,
                right: `${fract.num === 1 && root.text ? '' : fract.num}${root.text}`,
            });
        }
        if (root.value !== 1) {
            const fract = findCommonFractions(value * root.value);
            if (fract) {
                options.push({
                    err: fract.err,
                    left: `${fract.denom === 1 && root.text ? '' : fract.denom}${root.text}`,
                    right: `${fract.num}`,
                });
            }
        }
    });
    options.sort((a, b) => a.err - b.err);
    console.log('all the options', options);
    if (options.length) {
        return options[0];
    }
    return {left: `${value.toFixed(4)}`, right: '1'};
};
