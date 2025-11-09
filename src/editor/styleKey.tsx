import {StyleLine, Fill} from '../types';

export const styleKey = (s: StyleLine | Fill) => {
    const lighten = s.lighten ?? 0;
    return lighten === 0 ? (s.color ?? 0) : `${s.color}${'/' + lighten}`;
};
