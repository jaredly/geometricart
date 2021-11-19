/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { transparent } from './Icons';
import { Style, Fill, StyleLine } from './types';
import { lightenedColor, paletteColor } from './RenderPath';

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
        fills.push({ color: [], inset: [], opacity: [], lighten: [] });
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
            addIfNew(fills[i].lighten, fill?.lighten ?? null);
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
                            onChange(updateFill(styles, i, color, 'color'));
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
                                    updateFill(
                                        styles,
                                        i,
                                        opacity ?? undefined,
                                        'opacity',
                                    ),
                                );
                            }}
                        />
                    </div>
                    <div style={{ flexBasis: 16 }} />
                    <div key={`inset-${i}`}>
                        inset:
                        <MultiNumber
                            value={fill.inset}
                            onChange={(inset) => {
                                onChange(
                                    updateFill(
                                        styles,
                                        i,
                                        inset ?? undefined,
                                        'inset',
                                    ),
                                );
                            }}
                        />
                    </div>
                    <div style={{ flexBasis: 16 }} />
                    <div key={`lighten-${i}`}>
                        lighten/darken:
                        <LightDark
                            lighten={fill.lighten}
                            palette={palette}
                            color={fill.color}
                            onChange={(lighten) => {
                                onChange(
                                    updateFill(
                                        styles,
                                        i,
                                        lighten ?? undefined,
                                        'lighten',
                                    ),
                                );
                            }}
                        />
                    </div>
                </div>
            ))}
            <button
                onClick={() => {
                    const maxNum = styles.reduce(
                        (num, style) => Math.max(num, style.fills.length),
                        0,
                    );
                    const maxInset = styles.reduce(
                        (num, style) =>
                            Math.max(
                                num,
                                style.fills.reduce(
                                    (n, f) => Math.max(n, f?.inset ?? 0),
                                    0,
                                ),
                            ),
                        0,
                    );
                    const inset = maxInset + 5;
                    onChange(
                        styles.map((style) => {
                            const fills = style.fills.slice();
                            for (let i = fills.length; i < maxNum; i++) {
                                fills.push(null);
                            }
                            fills.push({ color: 0, inset });
                            return { ...style, fills };
                        }),
                    );
                }}
            >
                Add inset fill
            </button>
            <div>Lines</div>
            {lines.map((line, i) => (
                <div css={{ display: 'flex', alignItems: 'center' }}>
                    <MultiColor
                        color={line.color}
                        onChange={(color) => {
                            onChange(updateLine(styles, i, color, 'color'));
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
                                    updateLine(
                                        styles,
                                        i,
                                        width ?? undefined,
                                        'width',
                                    ),
                                );
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const LightDark = ({
    lighten,
    palette,
    color,
    onChange,
}: {
    lighten: Array<number | null>;
    palette: Array<string>;
    color: Array<string | number | null>;
    onChange: (value: number | null) => void;
}) => {
    const options = [-3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3];
    const allSame = lighten.length === 1 ? lighten[0] : null;
    return (
        <div css={{ display: 'flex' }}>
            {options.map((value, i) => (
                <div key={i}>
                    {color.filter(Boolean).map((color) => (
                        <div
                            onClick={() =>
                                onChange(allSame === value ? null : value)
                            }
                            style={{
                                borderColor:
                                    allSame === value ||
                                    (allSame == null && value === 0)
                                        ? 'white'
                                        : 'transparent',
                                background: paletteColor(
                                    palette,
                                    color!,
                                    value,
                                ),
                            }}
                            css={{
                                border: '2px solid transparent',
                                width: 20,
                                height: 20,
                            }}
                        />
                    ))}
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
    lighten: Array<number | null>;
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
              color: two.color != null ? two.color : one.color,
              inset: two.inset != null ? two.inset : one.inset,
              opacity: two.opacity != null ? two.opacity : one.opacity,
              lighten: two.lighten != null ? two.lighten : one.lighten,
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
            css={{
                width: 50,
            }}
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

export function updateLine(
    styles: Style[],
    i: number,
    value: string | number | undefined,
    key: keyof StyleLine,
): (Style | null)[] {
    return styles.map((style) => {
        if (style.lines[i] != null && style.lines[i]![key] == value) {
            return null;
        }
        const lines = style.lines.slice();
        if (!lines[i]) {
            lines[i] = { [key]: value };
        } else {
            lines[i] = { ...lines[i], [key]: value };
        }
        return { ...style, lines };
    });
}

export function updateFill(
    styles: Style[],
    i: number,
    value: string | number | undefined,
    key: keyof Fill,
): (Style | null)[] {
    return styles.map((style) => {
        if (style.fills[i] != null && style.fills[i]![key] == value) {
            return null;
        }
        const fills = style.fills.slice();
        if (!fills[i]) {
            fills[i] = { [key]: value };
        } else {
            fills[i] = { ...fills[i], [key]: value };
        }
        return { ...style, fills };
    });
}
