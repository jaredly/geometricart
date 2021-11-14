/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import { transparent } from './Icons';
import { Style, Fill, StyleLine } from './types';

// I want to be able to communicate:
// - all have same (one thing selected)
// - all empty (nothing seleted)
// - some have, some don't (one thing selected ... but pale?)
// - different values (multiple things selected)
// values: [one]
// values: [null]
// values: [one, two, null, etc.]
// values: [one, null]

export const MultiStyleForm = ({
    styles,
    onChange,
    palette,
}: {
    styles: Array<Style>;
    onChange: (updated: Array<Style | null>) => void;
    palette: Array<string>;
}) => {
    const fills: Array<MultiFill> = [];
    const maxFills = styles.reduce(
        (num, style) => Math.max(num, style.fills.length),
        0,
    );
    for (let i = 0; i < maxFills; i++) {
        fills.push({ color: [], inset: [] });
    }
    styles.forEach((style) => {
        style.fills.forEach((fill, i) => {
            addIfNew(fills[i].color, fill?.color ?? null);
            addIfNew(fills[i].inset, fill?.inset ?? null);
        });
    });
    return (
        <div>
            Change {styles.length} styles.
            {JSON.stringify(fills)}
            {fills.map((fill, i) => (
                <MultiColor
                    color={fill.color}
                    onChange={(color) => {
                        onChange(
                            styles.map((style) => {
                                if (
                                    style.fills[i] != null &&
                                    style.fills[i]!.color == color
                                ) {
                                    return null;
                                }
                                const fills = style.fills.slice();
                                if (!fills[i]) {
                                    fills[i] = { color };
                                } else {
                                    fills[i] = { ...fills[i], color };
                                }
                                return { ...style, fills };
                            }),
                        );
                        // ok
                    }}
                    palette={palette}
                    key={i}
                />
            ))}
        </div>
    );
};

export type MultiFill = {
    color: Array<string | number | null>;
    inset: Array<number | null>;
};

export const addIfNew = <T,>(items: Array<T>, value: T) => {
    if (!items.includes(value)) {
        items.push(value);
    }
};

export const mergeFills = (one: Fill, two: Fill | null): Fill =>
    !two
        ? one
        : {
              color: two.color ?? one.color,
              inset: two.inset ?? one.inset,
          };
export const mergeStyleLines = (
    one: StyleLine,
    two: null | StyleLine,
): StyleLine =>
    !two
        ? one
        : {
              color: two.color ?? one.color,
              dash: two.dash ?? one.dash,
              inset: two.inset ?? one.inset,
              joinStyle: two.joinStyle ?? one.joinStyle,
              width: two.width ?? one.width,
          };

export const mergeStyles = (one: Style, two: Style) => {
    const result: Style = { fills: [], lines: [] };
    one.fills.forEach((fill, i) => {
        if (fill) {
            result.fills.push(mergeFills(fill, two.fills[i]));
        } else {
            result.fills.push(two.fills[i]);
        }
    });
    result.fills.push(...two.fills.slice(one.fills.length));
    one.lines.forEach((line, i) => {
        if (line) {
            result.lines.push(mergeStyleLines(line, two.lines[i]));
        } else {
            result.lines.push(two.lines[i]);
        }
    });
    result.lines.push(...two.lines.slice(one.lines.length));
    return result;
};

export const MultiColor = ({
    color,
    onChange,
    palette,
}: {
    color: Array<string | null | number>;
    onChange: (color: string | number) => void;
    palette: Array<string>;
}) => {
    const options = ['black', 'white', 'transparent'];
    const highlight = color.length === 1 ? 'white' : '#faa';
    return (
        <div>
            {palette.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    style={{
                        border: `2px solid ${
                            color.includes(i) ? highlight : '#444'
                        }`,
                    }}
                    css={{
                        background: item,
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                    }}
                />
            ))}
            {options.map((name, i) => (
                <button
                    key={name}
                    onClick={() => onChange(name)}
                    css={{
                        background:
                            name === 'transparent'
                                ? `url("${transparent}")`
                                : name,
                        border: `2px solid ${
                            color.includes(name) ? highlight : '#444'
                        }`,
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                    }}
                ></button>
            ))}
        </div>
    );
};
