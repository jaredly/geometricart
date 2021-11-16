/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
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
    const lines: Array<MultiLine> = [];
    const maxLines = styles.reduce(
        (num, style) => Math.max(num, style.lines.length),
        0,
    );
    const maxFills = styles.reduce(
        (num, style) => Math.max(num, style.fills.length),
        0,
    );
    for (let i = 0; i < maxFills; i++) {
        fills.push({ color: [], inset: [], opacity: [] });
    }
    for (let i = 0; i < maxLines; i++) {
        lines.push({
            color: [],
            inset: [],
            dash: [],
            joinStyle: [],
            width: [],
        });
    }
    styles.forEach((style) => {
        style.fills.forEach((fill, i) => {
            addIfNew(fills[i].color, fill?.color ?? null);
            addIfNew(fills[i].inset, fill?.inset ?? null);
            addIfNew(fills[i].opacity, fill?.opacity ?? null);
        });
        style.lines.forEach((line, i) => {
            addIfNew(lines[i].color, line?.color ?? null);
            addIfNew(lines[i].inset, line?.inset ?? null);
            addIfNew(lines[i].width, line?.width ?? null);
        });
    });
    return (
        <div>
            Change {styles.length} styles.
            <div>Fills</div>
            {fills.map((fill, i) => (
                <div css={{ display: 'flex', alignItems: 'center' }}>
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
                    <div style={{ flexBasis: 16 }} />
                    <div key={`opacity-${i}`}>
                        opacity:
                        <MultiNumber
                            value={fill.opacity}
                            onChange={(opacity) => {
                                onChange(
                                    styles.map((style) => {
                                        if (
                                            style.fills[i] != null &&
                                            style.fills[i]!.opacity == opacity
                                        ) {
                                            return null;
                                        }
                                        const fills = style.fills.slice();
                                        if (!fills[i]) {
                                            fills[i] = {
                                                opacity: opacity ?? undefined,
                                            };
                                        } else {
                                            fills[i] = {
                                                ...fills[i],
                                                opacity: opacity ?? undefined,
                                            };
                                        }
                                        return { ...style, fills };
                                    }),
                                );
                            }}
                        />
                    </div>
                </div>
            ))}
            <div>Lines</div>
            {lines.map((line, i) => (
                <div css={{ display: 'flex', alignItems: 'center' }}>
                    <MultiColor
                        color={line.color}
                        onChange={(color) => {
                            onChange(
                                styles.map((style) => {
                                    if (
                                        style.lines[i] != null &&
                                        style.lines[i]!.color == color
                                    ) {
                                        return null;
                                    }
                                    const lines = style.lines.slice();
                                    if (!lines[i]) {
                                        lines[i] = { color };
                                    } else {
                                        lines[i] = { ...lines[i], color };
                                    }
                                    return { ...style, lines };
                                }),
                            );
                            // ok
                        }}
                        palette={palette}
                        key={i}
                    />
                    <div style={{ flexBasis: 16 }} />
                    <div key={`stroke-${i}`}>
                        width:
                        <MultiNumber
                            value={line.width}
                            onChange={(width) => {
                                onChange(
                                    styles.map((style) => {
                                        if (
                                            style.lines[i] != null &&
                                            style.lines[i]!.width == width
                                        ) {
                                            return null;
                                        }
                                        const lines = style.lines.slice();
                                        if (!lines[i]) {
                                            lines[i] = {
                                                width: width ?? undefined,
                                            };
                                        } else {
                                            lines[i] = {
                                                ...lines[i],
                                                width: width ?? undefined,
                                            };
                                        }
                                        return { ...style, lines };
                                    }),
                                );
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export type MultiLine = {
    inset: Array<number | null>;
    color: Array<null | string | number>;
    width: Array<null | number>;
    dash: Array<null | Array<number>>;
    joinStyle: Array<null | string>;
};

export type MultiFill = {
    color: Array<string | number | null>;
    opacity: Array<number | null>;
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

export const MultiNumber = ({
    value,
    onChange,
}: {
    value: Array<number | null>;
    onChange: (value: number | null) => void;
}) => {
    const [text, setText] = React.useState(null as null | string);
    return (
        <input
            value={text ?? (value.length === 1 ? value[0] ?? '' : 'mixed')}
            onChange={(evt) => setText(evt.target.value)}
            onBlur={() => {
                if (text != null) {
                    const num = parseFloat(text);
                    if (value.length === 1) {
                        if (value[0] == null && text.trim() == '') {
                            return;
                        }
                        if (num == value[0]) {
                            return;
                        }
                    }
                    if (text.trim() == '') {
                        return onChange(null);
                    }
                    if (!isNaN(num)) {
                        onChange(num);
                    }
                }
                setText(null);
            }}
        />
    );
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
                        background: maybeUrlColor(item),
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
                                : maybeUrlColor(name),
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

export const maybeUrlColor = (color: string) =>
    color.startsWith('http') ? `url("${color}")` : color;
