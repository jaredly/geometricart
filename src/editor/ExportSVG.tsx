/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React, { useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Canvas } from './Canvas';
import { BlurInt, Toggle } from './Forms';
import { PREFIX, SUFFIX } from './Sidebar';
import { Action } from '../state/Action';
import { initialHistory } from '../state/initialState';
import { Path, State } from '../types';
import { calcPPI } from './SVGCanvas';
import {
    Bounds,
    DL,
    Multi,
    blankCanvasProps,
    findBoundingRect,
} from './Export';
import { constantColors, maybeUrlColor } from './MultiStyleForm';

export function ExportSVG({
    state,
    dispatch,
    originalSize,
    embed,
    history,
    name,
}: {
    state: State;
    dispatch: (action: Action) => void;
    originalSize: number;
    embed: boolean;
    history: boolean;
    name: string;
}) {
    const [url, setUrl] = React.useState(
        null as null | { url: string; info: string }[],
    );
    const boundingRect = React.useMemo(
        () => findBoundingRect(state),
        [state.paths, state.pathGroups, state.clips],
    );

    const [crop, setCrop] = React.useState(10 as null | number);

    return (
        <div css={{ marginTop: 16, border: '1px solid #aaa', padding: 8 }}>
            <Toggle
                label="Laser Cut Mode"
                value={!!state.view.laserCutMode}
                onChange={(laserCutMode) =>
                    dispatch({
                        type: 'view:update',
                        view: { ...state.view, laserCutMode },
                    })
                }
            />
            pixels per inch:{' '}
            <BlurInt
                value={state.meta.ppi}
                onChange={(ppi) =>
                    ppi != null
                        ? dispatch({
                              type: 'meta:update',
                              meta: { ...state.meta, ppi },
                          })
                        : null
                }
                label={(ppi) => (
                    <div css={{ marginTop: 8 }}>
                        Width: {(originalSize / ppi).toFixed(2)}in.
                        <br />
                        Content Size:
                        {boundingRect
                            ? ` ${(
                                  ((boundingRect.x2 - boundingRect.x1) / ppi) *
                                  state.view.zoom
                              ).toFixed(2)}in x ${(
                                  ((boundingRect.y2 - boundingRect.y1) / ppi) *
                                  state.view.zoom
                              ).toFixed(2)}in`
                            : null}
                        <FullLength state={state} />
                    </div>
                )}
            />
            <br />
            Crop margin (in/100):
            <BlurInt value={crop} onChange={(crop) => setCrop(crop ?? null)} />
            <br />
            {state.view.multi ? (
                multiForm(state, state.view.multi, dispatch)
            ) : (
                <button
                    css={{ marginTop: 16, display: 'block' }}
                    onClick={() =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    outline: null,
                                    shapes: [null],
                                    columns: 1,
                                    rows: 1,
                                },
                            },
                        })
                    }
                >
                    Multi SVG
                </button>
            )}
            <br />
            <button
                css={{ marginTop: 16, display: 'block' }}
                onClick={() =>
                    runSVGExport({
                        crop,
                        boundingRect,
                        state,
                        originalSize,
                        embed,
                        history,
                        setUrl,
                        multi: state.view.multi,
                    })
                }
            >
                Export SVG
            </button>
            {url ? <button onClick={() => setUrl(null)}>Close</button> : null}
            {url ? (
                <div
                    css={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {url.length === 1 ? (
                        <DL
                            url={url[0].url}
                            subtitle={url[0].info}
                            name={name}
                        />
                    ) : (
                        url.map((url, i) => (
                            <DL
                                url={url.url}
                                subtitle={url.info}
                                name={name.replace(
                                    '.svg',
                                    `-${(i + '').padStart(2, '0')}.svg`,
                                )}
                                key={i}
                            />
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
function multiForm(
    state: State,
    multi: NonNullable<State['view']['multi']>,
    dispatch: React.Dispatch<Action>,
): React.ReactNode {
    const colors: { [key: string | number]: number } = {};

    Object.entries(state.paths).forEach(([k, path]) => {
        path.style.lines.forEach((line) => {
            if (line && line.color != null) {
                colors[line.color] = (colors[line.color] || 0) + 1;
            }
        });
    });

    return (
        <div
            css={{
                border: '1px solid #aaa',
                padding: 8,
                marginTop: 8,
            }}
        >
            Multi SVG Settings
            <div css={{ marginTop: 8 }}>
                Outline Color:
                <Select
                    current={multi.outline}
                    state={state}
                    colors={colors}
                    onChange={(color) => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    outline: color,
                                },
                            },
                        });
                    }}
                />
            </div>
            <div css={{ marginTop: 8 }}>
                Shape line Color:
                {multi.shapes.map((color, i) => (
                    <Select
                        key={i}
                        current={color}
                        state={state}
                        colors={colors}
                        onChange={(color) => {
                            const shapes = multi.shapes.slice();
                            if (color == null) {
                                shapes.splice(1, i);
                            } else {
                                shapes[i] = color;
                            }
                            dispatch({
                                type: 'view:update',
                                view: {
                                    ...state.view,
                                    multi: { ...multi, shapes },
                                },
                            });
                        }}
                    />
                ))}
                <button
                    onClick={() => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    shapes: multi.shapes.concat([null]),
                                },
                            },
                        });
                    }}
                >
                    Add a shape color
                </button>
            </div>
            <div>
                Columns
                <input
                    type="number"
                    min="0"
                    max="100"
                    style={{ width: 50 }}
                    value={multi.columns}
                    onChange={(evt) =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: { ...multi, columns: +evt.target.value },
                            },
                        })
                    }
                />
                Rows
                <input
                    type="number"
                    min="0"
                    max="100"
                    style={{ width: 50 }}
                    value={multi.rows}
                    onChange={(evt) =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: { ...multi, rows: +evt.target.value },
                            },
                        })
                    }
                />
            </div>
            <label>
                <input
                    type="checkbox"
                    checked={!!multi.combineGroups}
                    onChange={() =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    combineGroups: !multi.combineGroups,
                                },
                            },
                        })
                    }
                />
                Combine groups?
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={!!multi.skipBacking}
                    onChange={() =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    skipBacking: !multi.skipBacking,
                                },
                            },
                        })
                    }
                />
                Skip backing?
            </label>
            <button
                css={{ marginTop: 16, display: 'block' }}
                onClick={() =>
                    dispatch({
                        type: 'view:update',
                        view: {
                            ...state.view,
                            multi: undefined,
                        },
                    })
                }
            >
                Cancel
            </button>
        </div>
    );
}

async function runSVGExport({
    crop,
    boundingRect,
    state,
    originalSize,
    embed,
    history,
    setUrl,
    multi,
}: {
    crop: number | null;
    boundingRect: Bounds | null;
    state: State;
    originalSize: number;
    embed: boolean;
    history: boolean;
    setUrl: React.Dispatch<
        React.SetStateAction<null | { url: string; info: string }[]>
    >;
    multi?: null | Multi;
}) {
    const size = calcSVGSize(crop, boundingRect, state, originalSize);

    if (multi) {
        const outlines: Path[] = [];
        const pathsToRender: Path[][] = [];
        if (!multi.skipBacking) {
            pathsToRender.push([]);
        }
        const byGroup: { [key: string]: Path[] } = {};
        console.log('mshapes', multi.shapes);
        Object.keys(state.paths).forEach((k) => {
            let path = state.paths[k];
            if (path.style.fills.length) {
                return;
            }
            const out = path.style.lines.find(
                (s) => s && s.color === multi.outline,
            );
            if (out) {
                outlines.push({ ...path, style: { fills: [], lines: [out] } });
            }
            multi.shapes.forEach((shape) => {
                if (shape == null) return;

                const line = path.style.lines.find(
                    (s) => s && s.color === shape,
                );
                if (!line) return;
                // path =
                const oneLine = {
                    ...path,
                    style: { fills: [], lines: [line] },
                };
                const group = multi.combineGroups ? 'aa' : path.group;
                if (group) {
                    if (!byGroup[group + ':' + shape]) {
                        byGroup[group + ':' + shape] = [];
                    }
                    byGroup[group + ':' + shape].push(oneLine);
                } else {
                    pathsToRender.push([oneLine]);
                }
            });
        });
        pathsToRender.push(...Object.values(byGroup));

        const urls: { url: string; info: string }[] = [];
        const perImage = multi.rows * multi.columns;
        for (let i = 0; i < pathsToRender.length; i += perImage) {
            let contents = pathsToRender
                .slice(i, i + perImage)
                .map((paths, i) => {
                    const map: State['paths'] = {};
                    let aa = 0;
                    paths.forEach((path) => (map[aa++] = path));
                    outlines.forEach((path) => (map[aa++] = path));

                    const r = (i / multi.columns) | 0;
                    const c = i % multi.columns;

                    return `<g transform="translate(${size.width * c}, ${
                        size.height * r
                    })">${getSVGText(
                        { ...state, paths: map },
                        size,
                        true,
                    )}</g>`;
                });
            const info = `${calcPPI(
                state.meta.ppi,
                size.width * multi.columns,
                state.view.zoom,
            )}x${calcPPI(
                state.meta.ppi,
                size.height * multi.rows,
                state.view.zoom,
            )}`;
            let full = `
            <svg
                width="${calcPPI(
                    state.meta.ppi,
                    size.width * multi.columns,
                    state.view.zoom,
                )}"
                height="${calcPPI(
                    state.meta.ppi,
                    size.height * multi.rows,
                    state.view.zoom,
                )}"
                viewBox="0 0 ${size.width * multi.columns} ${
                size.height * multi.rows
            }"
                xmlns="http://www.w3.org/2000/svg"
            >${contents.join('')}</svg>
            `;
            if (embed) {
                full += `\n\n${PREFIX}${JSON.stringify(
                    history ? state : { ...state, history: initialHistory },
                )}${SUFFIX}`;
            }
            const blob = new Blob([full], { type: 'image/svg+xml' });
            urls.push({ url: URL.createObjectURL(blob), info });
        }

        setUrl(urls);
        return;
    }

    let text = getSVGText(state, size);

    if (embed) {
        text += `\n\n${PREFIX}${JSON.stringify(
            history ? state : { ...state, history: initialHistory },
        )}${SUFFIX}`;
    }
    const blob = new Blob([text], { type: 'image/svg+xml' });
    setUrl([{ url: URL.createObjectURL(blob), info: 'no info sry' }]);
}
function getSVGText(
    state: State,
    size: { width: number; height: number },
    inner = false,
) {
    const dest = document.createElement('div');
    let svgNode: SVGElement | null = null;
    const rstate = state.view.laserCutMode
        ? {
              ...state,
              pending: null,
              overlays: {},
              view: {
                  ...state.view,
                  background: undefined,
                  guides: false,
                  sketchiness: undefined,
                  texture: undefined,
              },
              selection: null,
          }
        : state;
    ReactDOM.render(
        <Canvas
            {...blankCanvasProps}
            {...size}
            innerRef={(node) => (svgNode = node)}
            ppi={state.meta.ppi}
            state={rstate}
        />,
        dest,
    );

    return inner ? svgNode!.innerHTML : svgNode!.outerHTML;
}
function calcSVGSize(
    crop: number | null,
    boundingRect: Bounds | null,
    state: State,
    originalSize: number,
) {
    const h =
        crop && boundingRect
            ? (boundingRect.y2 - boundingRect.y1) * state.view.zoom +
              (crop / 50) * state.meta.ppi
            : originalSize;
    const w =
        crop && boundingRect
            ? (boundingRect.x2 - boundingRect.x1) * state.view.zoom +
              (crop / 50) * state.meta.ppi
            : originalSize;
    const size = { width: w, height: h };
    return size;
}

export const Select = ({
    current,
    state,
    colors,
    onChange,
}: {
    current: string | number | null | undefined;
    state: State;
    colors: { [key: string | number]: number };
    onChange: (color: string | number | null) => void;
}) => {
    const [open, setOpen] = useState(false);

    return (
        <div css={{ position: 'relative' }}>
            <div
                css={{
                    border: '1px solid #777',
                    borderRadius: 4,
                    margin: '8px 0',
                }}
            >
                <Line
                    color={
                        typeof current === 'number'
                            ? state.palette[current]
                            : current
                    }
                    count={current != null ? colors[current] : null}
                    onClick={() => setOpen(!open)}
                />
                <button onClick={() => onChange(null)}>&times;</button>
            </div>

            {open ? (
                <div
                    css={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        backgroundColor: '#000',
                        zIndex: 1000,
                    }}
                >
                    {state.palette
                        .map((color, i) => (
                            <Line
                                key={i}
                                color={color}
                                count={colors[i]}
                                onClick={() => {
                                    onChange(i);
                                    setOpen(false);
                                }}
                            />
                        ))
                        .filter((_, i) => colors[i] != null)}
                    {constantColors
                        .filter((color) => colors[color] != null)
                        .map((color) => (
                            <Line
                                key={color}
                                color={color}
                                count={colors[color]}
                                onClick={() => {
                                    onChange(color);
                                    setOpen(false);
                                }}
                            />
                        ))}
                </div>
            ) : null}
        </div>
    );
};

const Line = ({
    color,
    count,
    onClick,
}: {
    color: string | null | undefined;
    count: number | null;
    onClick?: () => void;
}) => {
    return (
        <div
            css={{
                display: 'flex',
                flexDirection: 'row',
                padding: '4px 16px',
                cursor: 'pointer',
            }}
            onClick={onClick}
        >
            <div
                // onClick={() => onChange(i)}
                // onMouseOver={() => onHover(i)}
                // onMouseOut={() => onHover(null)}
                // style={{
                //     boxShadow: color.includes(i)
                //         ? `0 3px 0 ${highlight}`
                //         : 'none',
                //     // border: `2px solid ${
                //     //     color.includes(i) ? highlight : '#444'
                //     // }`,
                // }}
                css={{
                    background:
                        color != null ? maybeUrlColor(color) : undefined,
                    width: 20,
                    height: 20,
                    cursor: 'pointer',
                    border: 'none',
                    ':hover': {
                        outline: '1px solid magenta',
                        zIndex: 10,
                        position: 'relative',
                        borderBottom: 'none',
                    },
                }}
            />
            {color != null ? color : 'Select a color'}
            {count != null ? ' ' + count : null}
        </div>
    );
};

export const FullLength = ({ state }: { state: State }) => {
    const [ok, setOk] = useState(null as null | number);

    return (
        <div>
            {ok ? ok + 'mm' : 'Not calculated'}
            <button
                onClick={() => {
                    // hm
                }}
            >
                Calculate full cut length
            </button>
        </div>
    );
};
