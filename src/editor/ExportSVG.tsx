/* @jsx jsx */
/* @jsxFrag React.Fragment */
import {Interpolation, Theme, } from '@emotion/react';
import {Path as PKPath, PathKit} from 'pathkit-wasm';
import React, {useMemo, useState} from 'react';
import {pkPath} from '../sidebar/pkClipPaths';
import {Action} from '../state/Action';
import {initialHistory} from '../state/initialState';
import {Fill, Path, State, StyleLine} from '../types';
import {Bounds, DL, Multi, findBoundingRect} from './Export';
import {BlurInt, Toggle} from './Forms';
import {maybeUrlColor} from './MultiStyleForm';
import {lightenedColor, paletteColor} from './RenderPath';
import {calcPPI, viewPos} from './SVGCanvas';
import {PREFIX, SUFFIX} from './Sidebar';
import {pxToMM} from '../gcode/pxToMM';

const thinnestLine = (paths: State['paths']) => {
    let width = Infinity;
    Object.values(paths).forEach((path) => {
        path.style.lines.forEach((line) => {
            if (line && line.width != null) {
                width = Math.min(width, line.width);
            }
        });
    });
    return width;
};

const PPI = ({
    ppi,
    onChange,
    bounds,
    state,
}: {
    ppi: number;
    onChange: (ppi: number) => void;
    bounds: Bounds | null;
    state: State;
}) => {
    const thinnest = useMemo(() => thinnestLine(state.paths), [state.paths]);

    if (!bounds) return null;
    const w = bounds.x2 - bounds.x1;
    const h = bounds.y2 - bounds.y1;

    return (
        <div>
            <label>
                Width:{' '}
                <BlurInt
                    value={Math.round((w / ppi) * 100) / 100}
                    onChange={(v) => (v != null ? onChange(w / v) : null)}
                />
                in
            </label>
            <label style={{marginLeft: 8}}>
                Height:{' '}
                <BlurInt
                    value={Math.round((h / ppi) * 100) / 100}
                    onChange={(v) => (v != null ? onChange(h / v) : null)}
                />
                in
            </label>
            <br />
            Thinnest line: {Math.round(pxToMM(thinnest / 100, ppi) * 100) / 100}
            mm
        </div>
    );
};

export function ExportSVG({
    state,
    dispatch,
    originalSize,
    embed,
    history,
    name,
    PK,
}: {
    state: State;
    dispatch: (action: Action) => void;
    originalSize: number;
    embed: boolean;
    history: boolean;
    name: string;
    PK: PathKit;
}) {
    const [url, setUrl] = React.useState(null as null | {url: string; info: string}[]);
    const boundingRect = React.useMemo(
        () => findBoundingRect(state),
        [state.paths, state.pathGroups, state.clips],
    );

    const [crop, setCrop] = React.useState(10 as null | number);

    return (
        <div css={{marginTop: 16, border: '1px solid #aaa', padding: 8}}>
            <Toggle
                label="Laser Cut Mode"
                value={!!state.view.laserCutMode}
                onChange={(laserCutMode) =>
                    dispatch({
                        type: 'view:update',
                        view: {...state.view, laserCutMode},
                    })
                }
            />
            <PPI
                ppi={state.meta.ppi}
                bounds={boundingRect}
                onChange={(ppi) =>
                    ppi != null
                        ? dispatch({
                              type: 'meta:update',
                              meta: {...state.meta, ppi},
                          })
                        : null
                }
                state={state}
            />
            pixels per inch:{' '}
            <BlurInt
                value={Math.round(state.meta.ppi * 100) / 100}
                onChange={(ppi) =>
                    ppi != null
                        ? dispatch({
                              type: 'meta:update',
                              meta: {...state.meta, ppi},
                          })
                        : null
                }
                label={(ppi) => (
                    <div css={{marginTop: 8}}>
                        Content Size:
                        {boundingRect
                            ? ` ${((boundingRect.x2 - boundingRect.x1) / ppi).toFixed(2)}in x ${(
                                  (boundingRect.y2 - boundingRect.y1) / ppi
                              ).toFixed(2)}in`
                            : null}
                        {/* <FullLength state={state} /> */}
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
                    css={{marginTop: 16, display: 'block'}}
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
                css={{marginTop: 16, display: 'block'}}
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
                        PK,
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
                        <DL url={url[0].url} subtitle={url[0].info} name={name} />
                    ) : (
                        url.map((url, i) => (
                            <DL
                                url={url.url}
                                subtitle={url.info}
                                name={name.replace('.svg', `-${(i + '').padStart(2, '0')}.svg`)}
                                key={i}
                            />
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}

const styleKey = (s: StyleLine | Fill) => {
    const lighten = s.lighten ?? 0;
    return lighten === 0 ? (s.color ?? 0) : `${s.color}${'/' + lighten}`;
};

const parseStyleKey = (key: string | number): [string | number, number, string | number] => {
    if (typeof key === 'number') {
        return [key, 0, key];
    }
    const [name, lighten] = key.split('/');
    if (!isNaN(+name)) {
        return [+name, lighten ? +lighten : 0, key];
    }
    return [name, lighten ? +lighten : 0, key];
};

function multiForm(
    state: State,
    multi: NonNullable<State['view']['multi']>,
    dispatch: React.Dispatch<Action>,
): React.ReactNode {
    const colors: {[key: string | number]: number} = {};

    if (multi.useFills) {
        Object.entries(state.paths).forEach(([k, path]) => {
            path.style.fills.forEach((fill) => {
                if (fill && fill.color != null) {
                    const k = styleKey(fill);
                    colors[k] = (colors[k] || 0) + 1;
                }
            });
        });
    } else {
        Object.entries(state.paths).forEach(([k, path]) => {
            path.style.lines.forEach((line) => {
                if (line && line.color != null) {
                    const k = styleKey(line);
                    colors[k] = (colors[k] || 0) + 1;
                }
            });
        });
    }

    return (
        <div
            css={{
                border: '1px solid #aaa',
                padding: 8,
                marginTop: 8,
            }}
        >
            Multi SVG Settings
            <div css={{marginTop: 8}}>
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
            <div css={{marginTop: 8}}>
                Shape line Color:
                {multi.shapes.map((color, i) => (
                    <div key={i} style={{display: 'flex', alignItems: 'center'}}>
                        <div style={{flex: 1}}>
                            <Select
                                current={color}
                                state={state}
                                colors={colors}
                                onChange={(color) => {
                                    const shapes = multi.shapes.slice();
                                    if (color == null) {
                                        shapes.splice(i, 1);
                                    } else {
                                        shapes[i] = color;
                                    }
                                    dispatch({
                                        type: 'view:update',
                                        view: {
                                            ...state.view,
                                            multi: {...multi, shapes},
                                        },
                                    });
                                }}
                            />
                        </div>
                        <button
                            onClick={() => {
                                if (i === 0) return;
                                const shapes = multi.shapes.slice();
                                shapes.splice(i, 1);
                                shapes.splice(i - 1, 0, color);
                                dispatch({
                                    type: 'view:update',
                                    view: {...state.view, multi: {...multi, shapes}},
                                });
                            }}
                        >
                            up
                        </button>
                        <button
                            onClick={() => {
                                if (i === multi.shapes.length - 1) return;
                                const shapes = multi.shapes.slice();
                                shapes.splice(i, 1);
                                shapes.splice(i + 1, 0, color);
                                dispatch({
                                    type: 'view:update',
                                    view: {...state.view, multi: {...multi, shapes}},
                                });
                            }}
                        >
                            dn
                        </button>
                    </div>
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
                <button
                    onClick={() => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    shapes: Object.keys(colors),
                                },
                            },
                        });
                    }}
                >
                    Add all colors
                </button>
                <button
                    onClick={() => {
                        const shapes = multi.shapes.slice().reverse();
                        dispatch({
                            type: 'view:update',
                            view: {...state.view, multi: {...multi, shapes}},
                        });
                    }}
                >
                    Reverse
                </button>
            </div>
            <div>
                Columns
                <input
                    type="number"
                    min="0"
                    max="100"
                    style={{width: 50}}
                    value={multi.columns}
                    onChange={(evt) =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {...multi, columns: +evt.target.value},
                            },
                        })
                    }
                />
                Rows
                <input
                    type="number"
                    min="0"
                    max="100"
                    style={{width: 50}}
                    value={multi.rows}
                    onChange={(evt) =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {...multi, rows: +evt.target.value},
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
                    checked={!!multi.useFills}
                    onChange={() =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    useFills: !multi.useFills,
                                },
                            },
                        })
                    }
                />
                Use fills
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
            <label style={{display: 'inline-block'}}>
                <input
                    type="checkbox"
                    checked={!!multi.traceAndMerge}
                    onChange={() =>
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                multi: {
                                    ...multi,
                                    traceAndMerge: !multi.traceAndMerge,
                                },
                            },
                        })
                    }
                />
                Trace &amp; Merge Lines
            </label>
            <button
                css={{marginTop: 16, display: 'block'}}
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
    PK,
}: {
    crop: number | null;
    boundingRect: Bounds | null;
    state: State;
    originalSize: number;
    embed: boolean;
    history: boolean;
    setUrl: React.Dispatch<React.SetStateAction<null | {url: string; info: string}[]>>;
    multi?: null | Multi;
    PK: PathKit;
}) {
    const size = calcSVGSize(crop, boundingRect, state, originalSize);

    if (!multi) {
        let text = getSVGText(state, size);

        if (embed) {
            text += `\n\n${PREFIX}${JSON.stringify(
                history ? state : {...state, history: initialHistory},
            )}${SUFFIX}`;
        }
        const blob = new Blob([text], {type: 'image/svg+xml'});
        setUrl([{url: URL.createObjectURL(blob), info: 'no info sry'}]);
        return;
    }

    const {pathsToRender, outlines} = generatePathsAndOutlines(multi, Object.values(state.paths));
    console.log('paths to render', pathsToRender);

    const urls: {url: string; info: string}[] = [];
    const perImage = multi.rows * multi.columns;
    for (let i = 0; i < pathsToRender.length; i += perImage) {
        let contents = pathsToRender.slice(i, i + perImage).map((paths, i) => {
            const map: State['paths'] = {};
            let aa = 0;
            paths.forEach((path) => (map[aa++] = path));
            outlines.forEach((path) => (map[aa++] = path));

            const r = (i / multi.columns) | 0;
            const c = i % multi.columns;

            return `<g transform="translate(${size.width * c}, ${size.height * r})">${
                multi.traceAndMerge
                    ? traceAndMergePaths(PK, {...state, paths: map}, size)
                    : getSVGText({...state, paths: map}, size, true)
            }</g>`;
        });
        const info = `${calcPPI(
            state.meta.ppi,
            size.width * multi.columns,
            state.view.zoom,
        )}x${calcPPI(state.meta.ppi, size.height * multi.rows, state.view.zoom)}`;
        let full = `
            <svg
                width="${calcPPI(state.meta.ppi, size.width * multi.columns, state.view.zoom)}"
                height="${calcPPI(state.meta.ppi, size.height * multi.rows, state.view.zoom)}"
                viewBox="0 0 ${size.width * multi.columns} ${size.height * multi.rows}"
                xmlns="http://www.w3.org/2000/svg"
            >${contents.join('')}</svg>
            `;
        // const d = document.createElement('div');
        // d.innerHTML = full;
        // document.body.append(d);
        if (embed) {
            full += `\n\n${PREFIX}${JSON.stringify(
                history ? state : {...state, history: initialHistory},
            )}${SUFFIX}`;
        }
        const blob = new Blob([full], {type: 'image/svg+xml'});
        urls.push({url: URL.createObjectURL(blob), info});
    }

    setUrl(urls);
    return;
}

const traceAndMergePaths = (PK: PathKit, state: State, size: {width: number; height: number}) => {
    const zoom = state.view.zoom;
    const {x, y} = viewPos(state.view, size.width, size.height);

    const backer = Object.keys(state.paths).length === 1;

    let pk = null as null | PKPath;
    let c: string | undefined;
    Object.values(state.paths).forEach((path) => {
        const st = path.style.lines[0];
        if (!st) {
            throw new Error(`path has no lines`);
        }
        let w = st?.width;
        w = w ? (w / 100) * zoom : 2;
        c = paletteColor(state.palette, st?.color ?? 0, st?.lighten ?? 0);
        // const d = calcPathD(path, state.view.zoom)
        const p = pkPath(PK, path.segments, path.origin, path.open);
        const stroke = {
            width: w / zoom,
            join: PK.StrokeJoin.MITER,
            cap: PK.StrokeCap.ROUND,
        };
        if (backer) {
            const s = p.copy().stroke(stroke);
            p.op(s, PK.PathOp.UNION);
            s.delete();
        } else {
            p.stroke(stroke);
        }
        if (pk == null) {
            pk = p;
        } else {
            pk.op(p, PK.PathOp.UNION);
            p.delete();
        }
    });
    if (pk == null) return '';
    pk!.simplify();
    const d = pk!.toSVGString();
    pk!.delete();
    // return pk!.toSVGString();
    return `
    <path stroke="red" fill="none" stroke-width="0.03" d="${d}"
    transform="scale(${zoom} ${zoom}) translate(${x / zoom}, ${y / zoom})"
     />
     `;

    // return Object.values(state.paths)
    //     .map((path) => {
    //         const st = path.style.lines[0];
    //         const w = st?.width;
    //         const c = paletteColor(
    //             state.palette,
    //             st?.color ?? 0,
    //             st?.lighten ?? 0,
    //         );
    //         const d = calcPathD(path, state.view.zoom)
    //         return `
    //     <path fill="none" stroke="${c}" stroke-width="${
    //             w ? (w / 100) * zoom : 2
    //         }" d="${d}"
    //     transform="translate(${x}, ${y})"
    //      />
    //     `;
    //     })
    //     .join('\n');
};

export function generatePathsAndOutlines(
    multi: State['view']['multi'] & {},
    paths: Path[],
): {pathsToRender: Path[][]; outlines: Path[]} {
    // const outlines: Path[] = [];
    const pathsToRender: Path[][] = [];
    if (!multi.skipBacking) {
        pathsToRender.push([]);
    }

    const byStyleKey: Record<string, {style: StyleLine; paths: Path[]}> = {};

    paths.forEach((path) => {
        (multi.useFills ? path.style.fills : path.style.lines).forEach((style) => {
            if (style) {
                const k = styleKey(style);
                if (!byStyleKey[k]) {
                    byStyleKey[k] = {style, paths: []};
                }
                byStyleKey[k].paths.push(path);
            }
        });
    });
    // console.log("organized", byStyleKey);

    // console.log("multis", multi);
    const byGroup: {[key: string]: Path[]} = {};

    const outlines =
        multi.outline != null
            ? (byStyleKey[multi.outline]?.paths?.map((path) => ({
                  ...path,
                  style: {fills: [], lines: [byStyleKey[multi.outline!].style]},
              })) ?? [])
            : [];

    multi.shapes.forEach((shape, i) => {
        if (shape == null) return console.log('ignoring cause no shape');

        // const line = (multi.useFills ? path.style.fills : path.style.lines).find(
        //     (s) => s && styleKey(s) === shape,
        // );
        // if (!line) {
        //     // console.log(
        //     // 	multi.useFills ? path.style.fills : path.style.lines,
        //     // 	shape,
        //     // );
        //     return console.log("ignoring caus no matching style");
        // }
        if (!byStyleKey[shape]) {
            console.log('Nothing for', shape, byStyleKey);
        }

        byStyleKey[shape]?.paths.forEach((path) => {
            const oneLine = {
                ...path,
                style: {fills: [], lines: [byStyleKey[shape].style]},
            };
            const prefix = i.toString().padStart(2, '0') + ':';
            const group = multi.combineGroups ? 'aa' : path.group;
            if (group) {
                if (!byGroup[prefix + group + ':' + shape]) {
                    byGroup[prefix + group + ':' + shape] = [];
                }
                byGroup[prefix + group + ':' + shape].push(oneLine);
            } else {
                pathsToRender.push([oneLine]);
            }
        });
    });

    // paths.forEach((path) => {
    // 	// if (path.style.fills.length && !multi.useFills) {
    // 	// 	console.log("ignoring cause its filled");
    // 	// 	return;
    // 	// }
    // 	// const out = (multi.useFills ? path.style.fills : path.style.lines).find(
    // 	// 	(s) => s && styleKey(s) === multi.outline,
    // 	// );
    // 	// if (out) {
    // 	// 	outlines.push({ ...path, style: { fills: [], lines: [out] } });
    // 	// }
    // 	multi.shapes.forEach((shape, i) => {
    // 		if (shape == null) return console.log("ignoring cause no shape");

    // 		const line = (multi.useFills ? path.style.fills : path.style.lines).find(
    // 			(s) => s && styleKey(s) === shape,
    // 		);
    // 		if (!line) {
    // 			// console.log(
    // 			// 	multi.useFills ? path.style.fills : path.style.lines,
    // 			// 	shape,
    // 			// );
    // 			return console.log("ignoring caus no matching style");
    // 		}
    // 		const oneLine = {
    // 			...path,
    // 			style: { fills: [], lines: [line] },
    // 		};
    // 		const prefix = i.toString().padStart(2, "0") + ":";
    // 		const group = multi.combineGroups ? "aa" : path.group;
    // 		if (group) {
    // 			if (!byGroup[prefix + group + ":" + shape]) {
    // 				byGroup[prefix + group + ":" + shape] = [];
    // 			}
    // 			byGroup[prefix + group + ":" + shape].push(oneLine);
    // 		} else {
    // 			pathsToRender.push([oneLine]);
    // 		}
    // 	});
    // });

    console.log('bygrouped', byGroup);
    pathsToRender.push(
        ...Object.keys(byGroup)
            .sort()
            .map((k) => byGroup[k]),
    );
    return {pathsToRender, outlines};
}

function getSVGText(state: State, size: {width: number; height: number}, inner = false) {
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
    // I want this to be sync, so I need the old API
    trapWarn(() => {
        // ReactDOM.render(
        //     <Canvas
        //         {...blankCanvasProps}
        //         {...size}
        //         innerRef={(node) => (svgNode = node)}
        //         ppi={state.meta.ppi}
        //         state={rstate}
        //     />,
        //     dest,
        // );
    });

    return inner ? svgNode!.innerHTML : svgNode!.outerHTML;
}

const trapWarn = (fn: () => void) => {
    const prev = console.error;
    console.error = () => {};
    fn();
    console.error = prev;
};

function calcSVGSize(
    crop: number | null,
    boundingRect: Bounds | null,
    state: State,
    originalSize: number,
) {
    const h =
        crop && boundingRect
            ? (boundingRect.y2 - boundingRect.y1) * state.view.zoom + (crop / 50) * state.meta.ppi
            : originalSize;
    const w =
        crop && boundingRect
            ? (boundingRect.x2 - boundingRect.x1) * state.view.zoom + (crop / 50) * state.meta.ppi
            : originalSize;
    const size = {width: w, height: h};
    return size;
}

const Select = ({
    current,
    state,
    colors,
    onChange,
}: {
    current: string | number | null | undefined;
    state: State;
    colors: {[key: string]: number};
    onChange: (color: string | number | null) => void;
}) => {
    const [open, setOpen] = useState(false);

    const keys = Object.keys(colors).map(parseStyleKey);
    const ckey = current ? parseStyleKey(current) : null;

    return (
        <div css={{position: 'relative'}}>
            <div
                css={{
                    border: '1px solid #777',
                    borderRadius: 4,
                    margin: '8px 0',
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <Line
                    color={
                        ckey
                            ? typeof ckey[0] === 'number'
                                ? state.palette[ckey[0]]
                                : ckey[0]
                            : undefined
                    }
                    style={{flex: 1}}
                    lighten={ckey ? ckey[1] : 0}
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
                    {keys.map(([color, lighten, orig], i) => (
                        <Line
                            key={i}
                            color={typeof color === 'number' ? state.palette[color] : color}
                            style={{
                                ':hover': {
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                },
                            }}
                            lighten={lighten}
                            count={colors[i]}
                            onClick={() => {
                                onChange(orig);
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
    lighten,
    style,
}: {
    color: string | null | undefined;
    count: number | null;
    lighten: number;
    onClick?: () => void;
    style?: Interpolation<Theme>;
}) => {
    return (
        <div
            css={[
                {
                    display: 'flex',
                    flexDirection: 'row',
                    padding: '4px 16px',
                    cursor: 'pointer',
                },
                style,
            ]}
            onClick={onClick}
        >
            <div
                css={{
                    background:
                        color != null
                            ? lightenedColor([], maybeUrlColor(color), lighten)
                            : undefined,
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
            {color != null ? color + (lighten != 0 ? '/' + lighten : '') : 'Select a color'}
            {count != null ? ' ' + count : null}
        </div>
    );
};

// export const FullLength = ({ state }: { state: State }) => {
//     const [ok, setOk] = useState(null as null | number);

//     return (
//         <div>
//             {ok ? ok + 'mm' : 'Not calculated'}
//             <button
//                 onClick={() => {
//                     // hm
//                 }}
//             >
//                 Calculate full cut length
//             </button>
//         </div>
//     );
// };
