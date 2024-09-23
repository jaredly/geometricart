/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { transparent } from './Icons';
import { Style, Fill, StyleLine } from '../types';
import { colorSquare, paletteColor } from './RenderPath';
import { Button } from 'primereact/button';
import { Action } from '../state/Action';

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
    | { type: 'fill-lightness'; idx: number; lighten: number }
    | { type: 'line-lightness'; idx: number; lighten: number }
    | {
          type: 'line-color';
          idx: number;
          color: string | number;
      }; // TODO add line width and inset and stuff, when we have a slider or something

// This may be done after splitting everything.
export const applyStyleHover = (
    styleHover: StyleHover,
    style: Style,
): Style => {
    style = { ...style };
    if (styleHover.type === 'fill-color') {
        style.fills = style.fills.slice();
        if (
            style.fills.length === 1 &&
            style.fills[0]?.originalIdx === styleHover.idx
        ) {
            style.fills[0] = { ...style.fills[0], color: styleHover.color };
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
        if (
            style.lines.length === 1 &&
            style.lines[0]?.originalIdx === styleHover.idx
        ) {
            style.lines[0] = { ...style.lines[0], color: styleHover.color };
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
        if (
            style.lines.length === 1 &&
            style.lines[0]?.originalIdx === styleHover.idx
        ) {
            style.lines[0] = { ...style.lines[0], lighten: styleHover.lighten };
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
        if (
            style.fills.length === 1 &&
            style.fills[0]?.originalIdx === styleHover.idx
        ) {
            style.fills[0] = { ...style.fills[0], lighten: styleHover.lighten };
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

export const MultiStyleForm = ({
    styles,
    onChange,
    palette,
    onHover,
    dispatch,
}: {
    styles: Array<Style>;
    onChange: (updated: Array<Style | null>) => void;
    palette: Array<string>;
    onHover: (hover: StyleHover | null) => void;
    dispatch: React.Dispatch<Action>;
}) => {
    const { fills, lines } = collectMultiStyles(styles);
    return (
        <div css={{}}>
            <div className="mb-2 text-xs">{styles.length} shapes selected.</div>
            <h4 className="mb-2">Fills</h4>
            {fills.map((fill, i) => (
                <div
                    key={i}
                    className="p-3 py-2 mb-2 border-solid surface-border"
                >
                    <div key={`inset-${i}`}>
                        <details style={{ display: 'inline' }}>
                            <summary style={{ cursor: 'pointer' }}>
                                {fill.color.map((color, i) =>
                                    colorSquare(
                                        paletteColor(palette, color),
                                        i,
                                    ),
                                )}
                                inset
                                <span
                                    style={{
                                        width: 8,
                                        display: 'inline-block',
                                    }}
                                />
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
                                <span
                                    style={{
                                        width: 16,
                                        display: 'inline-block',
                                    }}
                                />
                                <Button
                                    onClick={() => {
                                        onChange(removeFill(styles, i));
                                    }}
                                    icon="pi pi-trash"
                                    className=" p-button-sm p-button-text p-button-danger"
                                    style={{ marginTop: -5, marginBottom: -6 }}
                                />
                            </summary>
                            <div css={{ display: 'flex', flexWrap: 'wrap' }}>
                                <MultiColor
                                    color={fill.color}
                                    onChange={(color) => {
                                        onChange(
                                            updateFill(
                                                styles,
                                                i,
                                                color,
                                                'color',
                                            ),
                                        );
                                        // ok
                                    }}
                                    onHover={(color) =>
                                        color != null
                                            ? onHover({
                                                  type: 'fill-color',
                                                  idx: i,
                                                  color,
                                              })
                                            : onHover(null)
                                    }
                                    palette={palette}
                                    key={i}
                                />
                                <div style={{ flexBasis: 16 }} />
                                <div key={`lighten-${i}`}>
                                    <LightDark
                                        lighten={fill.lighten}
                                        palette={palette}
                                        color={fill.color}
                                        onHover={(lighten) =>
                                            onHover(
                                                lighten != null
                                                    ? {
                                                          type: 'fill-lightness',
                                                          lighten,
                                                          idx: i,
                                                      }
                                                    : null,
                                            )
                                        }
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
                                    <div style={{ display: 'flex' }}>
                                        <div key={`variation-${i}`}>
                                            variation:
                                            <MultiNumber
                                                value={fill.colorVariation}
                                                onChange={(colorVariation) => {
                                                    onChange(
                                                        updateFill(
                                                            styles,
                                                            i,
                                                            colorVariation ??
                                                                undefined,
                                                            'colorVariation',
                                                        ),
                                                    );
                                                }}
                                            />
                                        </div>
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
                                                            opacity ??
                                                                undefined,
                                                            'opacity',
                                                        ),
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
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
                    const inset = maxInset + 8; // 4
                    const lightenAmt = 1; // 0.5
                    let at: Fill | null = null;
                    for (let style of styles) {
                        for (let fill of style.fills) {
                            if (fill?.inset === maxInset) {
                                at = fill;
                            }
                        }
                    }
                    onChange(
                        styles.map((style) => {
                            const fills = style.fills.slice();

                            let at: Fill | null = null;
                            for (let fill of style.fills) {
                                if (
                                    fill &&
                                    (at == null ||
                                        (at.inset ?? 0) < (fill.inset ?? 0))
                                ) {
                                    at = fill;
                                }
                            }

                            for (let i = fills.length; i < maxNum; i++) {
                                fills.push(null);
                            }
                            fills.push({
                                color: at?.color ?? 0,
                                inset,
                                lighten: (at?.lighten || 0) - lightenAmt,
                            });
                            return { ...style, fills };
                        }),
                    );
                }}
            >
                Add inset fill
            </button>
            <h4 className="mb-2">Lines</h4>
            {lines.map((line, i) => {
                const single = getSingularLine(line);
                return (
                    <div
                        key={i}
                        className="py-2 mb-2 surface-border"
                        css={{
                            borderTop: '1px solid',
                            borderBottom: '1px solid',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <details>
                            <summary style={{ cursor: 'pointer' }}>
                                {line.color.map((color, i) =>
                                    colorSquare(
                                        paletteColor(palette, color),
                                        i,
                                    ),
                                )}
                                inset
                                <span
                                    style={{
                                        width: 8,
                                        display: 'inline-block',
                                    }}
                                />
                                <MultiNumber
                                    value={line.inset}
                                    onChange={(inset) => {
                                        onChange(
                                            updateLine(
                                                styles,
                                                i,
                                                inset ?? undefined,
                                                'inset',
                                            ),
                                        );
                                    }}
                                />
                                <span
                                    style={{
                                        width: 8,
                                        display: 'inline-block',
                                    }}
                                />
                                width
                                <span
                                    style={{
                                        width: 8,
                                        display: 'inline-block',
                                    }}
                                />
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
                                <span
                                    style={{
                                        width: 16,
                                        display: 'inline-block',
                                    }}
                                />
                                <Button
                                    onClick={() => {
                                        onChange(removeLine(styles, i));
                                    }}
                                    icon="pi pi-trash"
                                    className=" p-button-sm p-button-text p-button-danger"
                                    style={{ marginTop: -5, marginBottom: -6 }}
                                />
                                {single ? (
                                    <Button
                                        onClick={() => {
                                            dispatch({
                                                type: 'select:same',
                                                line: single,
                                            });
                                        }}
                                        icon="pi pi-pencil"
                                        className=" p-button-sm p-button-text"
                                        style={{
                                            marginTop: -5,
                                            marginBottom: -6,
                                        }}
                                    />
                                ) : null}
                            </summary>
                            <MultiColor
                                color={line.color}
                                onChange={(color) => {
                                    onChange(
                                        updateLine(styles, i, color, 'color'),
                                    );
                                    // ok
                                }}
                                onHover={(color) =>
                                    color != null
                                        ? onHover({
                                              type: 'line-color',
                                              idx: i,
                                              color,
                                          })
                                        : onHover(null)
                                }
                                palette={palette}
                                key={i}
                            />
                            <div style={{ flexBasis: 16 }} />
                            <div key={`lighten-${i}`}>
                                <LightDark
                                    lighten={line.lighten}
                                    palette={palette}
                                    color={line.color}
                                    onHover={(lighten) =>
                                        onHover(
                                            lighten != null
                                                ? {
                                                      type: 'line-lightness',
                                                      lighten,
                                                      idx: i,
                                                  }
                                                : null,
                                        )
                                    }
                                    onChange={(lighten) => {
                                        onChange(
                                            updateLine(
                                                styles,
                                                i,
                                                lighten ?? undefined,
                                                'lighten',
                                            ),
                                        );
                                    }}
                                />
                            </div>
                            <div style={{ flexBasis: 16 }} />
                            <div key={`stroke-${i}`}></div>
                            <div style={{ flexBasis: 16 }} />
                            <div key={`inset-${i}`}></div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <div key={`variation-${i}`}>
                                    variation:
                                    <MultiNumber
                                        value={line.colorVariation}
                                        onChange={(colorVariation) => {
                                            onChange(
                                                updateLine(
                                                    styles,
                                                    i,
                                                    colorVariation ?? undefined,
                                                    'colorVariation',
                                                ),
                                            );
                                        }}
                                    />
                                </div>
                                <div style={{ flexBasis: 16 }} />
                                <div key={`opacity-${i}`}>
                                    opacity:
                                    <MultiNumber
                                        value={line.opacity}
                                        onChange={(opacity) => {
                                            onChange(
                                                updateLine(
                                                    styles,
                                                    i,
                                                    opacity ?? undefined,
                                                    'opacity',
                                                ),
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </details>
                    </div>
                );
            })}
            <button
                onClick={() => {
                    const maxNum = styles.reduce(
                        (num, style) => Math.max(num, style.lines.length),
                        0,
                    );
                    const maxInset = styles.reduce(
                        (num, style) =>
                            Math.max(
                                num,
                                style.lines.reduce(
                                    (n, f) => Math.max(n, f?.inset ?? 0),
                                    0,
                                ),
                            ),
                        0,
                    );
                    const inset = maxNum === 0 ? 0 : maxInset + 5;
                    onChange(
                        styles.map((style, i) => {
                            const color =
                                // @ts-ignore
                                style.fills.findLast(
                                    (f: Fill | null) => f?.color != null,
                                )?.color ??
                                // @ts-ignore
                                style.lines.findLast(
                                    (f: StyleLine | null) => f?.color != null,
                                )?.color ??
                                0;
                            const lines = style.lines.slice();
                            for (let i = lines.length; i < maxNum; i++) {
                                lines.push(null);
                            }
                            lines.push({ color, inset, width: 0 });
                            return { ...style, lines };
                        }),
                    );
                }}
            >
                Add inset line
            </button>
        </div>
    );
};

export const LightDark = ({
    lighten,
    palette,
    color,
    onChange,
    onHover,
}: {
    lighten: Array<number | null>;
    palette: Array<string>;
    color: Array<string | number | null>;
    onChange: (value: number | null) => void;
    onHover: (lighten: number | null) => void;
}) => {
    const options = [-3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3];
    const allSame = lighten.length === 1 ? lighten[0] : null;
    return (
        <div
            css={{
                display: 'flex',
                marginBottom: 2,
                flexWrap: 'wrap',
                flexShrink: 1,
            }}
        >
            {options.map((value, i) => (
                <div key={i}>
                    {color
                        .filter((x) => x != null)
                        .map((color) => (
                            <div
                                key={`${i}-${color}`}
                                onClick={() =>
                                    onChange(allSame === value ? null : value)
                                }
                                onMouseOver={() => onHover(value)}
                                onMouseOut={() => onHover(null)}
                                style={{
                                    // borderColor:
                                    // lighten.includes(value) ? 'black' : 'transparent',
                                    // allSame === value ||
                                    // (allSame == null && value === 0)
                                    //     ? '#000'
                                    //     : lighten.includes(value)
                                    //     ? '#f00'
                                    //     : '#000',
                                    boxShadow:
                                        lighten.includes(value) ||
                                        (value === 0 && lighten.includes(null))
                                            ? `0 3px 0 ${
                                                  allSame === value ||
                                                  (allSame == null &&
                                                      value === 0)
                                                      ? 'white'
                                                      : 'orange'
                                              }`
                                            : 'none',
                                    background: paletteColor(
                                        palette,
                                        color!,
                                        value,
                                    ),
                                }}
                                css={{
                                    cursor: 'pointer',
                                    ':hover': {
                                        outline: '1px solid magenta',
                                        zIndex: 10,
                                        position: 'relative',
                                        borderBottom: 'none',
                                    },
                                    borderBottom: '2px solid black',
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
    opacity: Array<number | null>;
    joinStyle: Array<null | string>;
    colorVariation: Array<number | null>;
    lighten: Array<number | null>;
};

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

export const getSingularLine = (line: MultiLine): StyleLine | null => {
    const style: StyleLine = {};
    if (line.inset.length > 1) return null;
    if (line.inset.length) style.inset = line.inset[0] ?? undefined;
    if (line.color.length > 1) return null;
    if (line.color.length) style.color = line.color[0] ?? undefined;
    if (line.width.length > 1) return null;
    if (line.width.length) style.width = line.width[0] ?? undefined;
    if (line.dash.length > 1) return null;
    if (line.dash.length) style.dash = line.dash[0] ?? undefined;
    if (line.opacity.length > 1) return null;
    if (line.opacity.length) style.opacity = line.opacity[0] ?? undefined;
    if (line.joinStyle.length > 1) return null;
    if (line.joinStyle.length) style.joinStyle = line.joinStyle[0] ?? undefined;
    if (line.colorVariation.length > 1) return null;
    if (line.colorVariation.length)
        style.colorVariation = line.colorVariation[0] ?? undefined;
    if (line.lighten.length > 1) return null;
    if (line.lighten.length) style.lighten = line.lighten[0] ?? undefined;
    return style;
};

export type MultiFill = {
    color: Array<string | number | null>;
    opacity: Array<number | null>;
    colorVariation: Array<number | null>;
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
    const commit = React.useCallback(() => {
        if (text != null && !text.includes(',')) {
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
    }, [text, value]);
    return (
        <input
            value={
                text ?? (value.length === 1 ? value[0] ?? '' : value.join(','))
            }
            onChange={(evt) => setText(evt.target.value)}
            css={{
                width: 50,
            }}
            onKeyDown={(evt) => {
                if (evt.key === 'Enter') {
                    commit();
                }
            }}
            onBlur={() => commit()}
        />
    );
};

export const constantColors = ['black', 'white', 'transparent'];

export const MultiColor = ({
    color,
    onChange,
    palette,
    onHover,
}: {
    color: Array<string | null | number>;
    onChange: (color: string | number) => void;
    palette: Array<string>;
    onHover: (color: string | number | null) => void;
}) => {
    const highlight = color.length === 1 ? 'white' : '#faa';
    return (
        <div
            css={{
                marginBottom: 4,
                marginTop: 2,
                display: 'flex',
                flexWrap: 'wrap',
                flexShrink: 1,
            }}
        >
            {palette.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    onMouseOver={() => onHover(i)}
                    onMouseOut={() => onHover(null)}
                    style={{
                        boxShadow: color.includes(i)
                            ? `0 3px 0 ${highlight}`
                            : 'none',
                        // border: `2px solid ${
                        //     color.includes(i) ? highlight : '#444'
                        // }`,
                    }}
                    css={{
                        background: maybeUrlColor(item),
                        width: 20,
                        display: 'block',
                        height: 20,
                        cursor: 'pointer',
                        border: 'none',
                        marginTop: 2,
                        borderBottom: '2px solid black',
                        ':hover': {
                            outline: '1px solid magenta',
                            zIndex: 10,
                            position: 'relative',
                            borderBottom: 'none',
                        },
                    }}
                />
            ))}
            {constantColors.map((name, i) => (
                <button
                    key={name + i}
                    onClick={() => onChange(name)}
                    onMouseOver={() => onHover(name)}
                    onMouseOut={() => onHover(null)}
                    style={{
                        background:
                            name === 'transparent'
                                ? `url("${transparent}")`
                                : maybeUrlColor(name),

                        boxShadow: color.includes(name)
                            ? `0 3px 0 ${highlight}`
                            : 'none',
                    }}
                    css={{
                        border: 'none',
                        // border: `2px solid ${
                        //     color.includes(name) ? highlight : '#444'
                        // }`,
                        marginTop: 2,
                        display: 'block',
                        borderBottom: '2px solid black',
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                        ':hover': {
                            outline: '1px solid magenta',
                            zIndex: 10,
                            position: 'relative',
                            borderBottom: 'none',
                        },
                    }}
                ></button>
            ))}
        </div>
    );
};

export const maybeUrlColor = (color: string) =>
    color.startsWith('http') ? `url("${color}")` : color;

export function collectMultiStyles(styles: Style[]) {
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
        fills.push({
            color: [],
            inset: [],
            opacity: [],
            lighten: [],
            colorVariation: [],
        });
    }
    for (let i = 0; i < maxLines; i++) {
        lines.push({
            color: [],
            inset: [],
            dash: [],
            lighten: [],
            opacity: [],
            colorVariation: [],
            joinStyle: [],
            width: [],
        });
    }
    styles.forEach((style) => {
        style.fills.forEach((fill, i) => {
            addIfNew(fills[i].color, fill?.color ?? null);
            addIfNew(fills[i].inset, fill?.inset ?? null);
            addIfNew(fills[i].opacity, fill?.opacity ?? null);
            addIfNew(fills[i].colorVariation, fill?.colorVariation ?? null);
            addIfNew(fills[i].lighten, fill?.lighten ?? null);
        });
        style.lines.forEach((line, i) => {
            addIfNew(lines[i].color, line?.color ?? null);
            addIfNew(lines[i].inset, line?.inset ?? null);
            addIfNew(lines[i].width, line?.width ?? null);
            addIfNew(lines[i].opacity, line?.opacity ?? null);
            addIfNew(lines[i].colorVariation, line?.colorVariation ?? null);
            addIfNew(lines[i].lighten, line?.lighten ?? null);
        });
    });
    return { fills, lines };
}

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

export function removeLine(styles: Style[], i: number): (Style | null)[] {
    return styles.map((style) => {
        if (i >= style.lines.length) {
            return null;
        }
        const lines = style.lines.slice();
        lines.splice(i, 1);
        return { ...style, lines };
    });
}

export function removeFill(styles: Style[], i: number): (Style | null)[] {
    return styles.map((style) => {
        if (i >= style.fills.length) {
            return null;
        }
        const fills = style.fills.slice();
        fills.splice(i, 1);
        return { ...style, fills };
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
