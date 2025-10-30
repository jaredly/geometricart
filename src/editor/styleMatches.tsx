import {StyleLine} from '../types';

export const styleMatches = (one: StyleLine, two: StyleLine): boolean => {
    return (
        (one.inset ?? 0) === (two.inset ?? 0) &&
        one.color === two.color &&
        one.width === two.width &&
        one.dash === two.dash &&
        one.opacity === two.opacity &&
        one.joinStyle === two.joinStyle &&
        one.colorVariation === two.colorVariation &&
        one.lighten === two.lighten
    );
};
