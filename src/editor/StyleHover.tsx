import {Style} from '../types';

// I want to be able to communicate:
// - all have same (one thing selected)
// - all empty (nothing seleted)
// - some have, some don't (one thing selected ... but pale?)
// - different values (multiple things selected)
// values: [one]
// values: [null]
// values: [one, two, null, etc.]
// values: [one, null]

export type StyleHover =
    | {
          type: 'fill-color';
          idx: number;
          color: string | number;
      }
    | {type: 'fill-lightness'; idx: number; lighten: number}
    | {type: 'line-lightness'; idx: number; lighten: number}
    | {
          type: 'line-color';
          idx: number;
          color: string | number;
      }; // TODO add line width and inset and stuff, when we have a slider or something

// This may be done after splitting everything.
export const applyStyleHover = (styleHover: StyleHover, style: Style): Style => {
    style = {...style};
    if (styleHover.type === 'fill-color') {
        style.fills = style.fills.slice();
        if (style.fills.length === 1 && style.fills[0]?.originalIdx === styleHover.idx) {
            style.fills[0] = {...style.fills[0], color: styleHover.color};
        } else {
            const fill = style.fills[styleHover.idx];
            if (fill) {
                style.fills[styleHover.idx] = {
                    ...fill,
                    color: styleHover.color,
                };
            }
        }
    } else if (styleHover.type === 'line-color') {
        style.lines = style.lines.slice();
        if (style.lines.length === 1 && style.lines[0]?.originalIdx === styleHover.idx) {
            style.lines[0] = {...style.lines[0], color: styleHover.color};
        } else {
            const line = style.lines[styleHover.idx];
            if (line) {
                style.lines[styleHover.idx] = {
                    ...line,
                    color: styleHover.color,
                };
            }
        }
    } else if (styleHover.type === 'line-lightness') {
        style.lines = style.lines.slice();
        if (style.lines.length === 1 && style.lines[0]?.originalIdx === styleHover.idx) {
            style.lines[0] = {...style.lines[0], lighten: styleHover.lighten};
        } else {
            const line = style.lines[styleHover.idx];
            if (line) {
                style.lines[styleHover.idx] = {
                    ...line,
                    lighten: styleHover.lighten,
                };
            }
        }
    } else if (styleHover.type === 'fill-lightness') {
        style.fills = style.fills.slice();
        if (style.fills.length === 1 && style.fills[0]?.originalIdx === styleHover.idx) {
            style.fills[0] = {...style.fills[0], lighten: styleHover.lighten};
        } else {
            const fill = style.fills[styleHover.idx];
            if (fill) {
                style.fills[styleHover.idx] = {
                    ...fill,
                    lighten: styleHover.lighten,
                };
            }
        }
    }
    return style;
};
