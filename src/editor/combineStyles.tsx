import {mergeStyleLines} from './mergeStyleLines';
import {mergeFills} from './mergeFills';
import {Style} from '../types';

export const combineStyles = (styles: Array<Style>): Style => {
    const result: Style = {
        fills: [],
        lines: [],
    };
    styles.forEach((style) => {
        style.fills.forEach((fill, i) => {
            if (fill != null) {
                result.fills[i] = result.fills[i] ? mergeFills(result.fills[i]!, fill) : fill;
            }
        });
        style.lines.forEach((line, i) => {
            if (line != null) {
                result.lines[i] = result.lines[i] ? mergeStyleLines(result.lines[i]!, line) : line;
            }
        });
    });

    return result;
};