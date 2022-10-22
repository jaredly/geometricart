import React, { useMemo, useState } from 'react';
import { findBoundingRect } from './editor/Export';
import { BlurInt, Text } from './editor/Forms';
import { paletteColor } from './editor/RenderPath';
import { generateGcode, generateLaserInset, pxToMM } from './generateGcode';
import { canvasRender } from './rendering/CanvasRender';
import { Action } from './state/Action';
import { initialState } from './state/initialState';
import { GCodePath, Path, State, StyleLine } from './types';

export const GCodeEditor = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const canvas = React.useRef(null as null | HTMLCanvasElement);

    const bounds = React.useMemo(
        () => findBoundingRect(state),
        [state.view, state.paths, state.pathGroups],
    );

    const originalSize = 1000;

    let h = bounds ? (bounds.y2 - bounds.y1) * state.view.zoom : originalSize;
    let w = bounds ? (bounds.x2 - bounds.x1) * state.view.zoom : originalSize;
    let dx = bounds ? (bounds.x1 + bounds.x2) / 2 : 0;
    let dy = bounds ? (bounds.y1 + bounds.y2) / 2 : 0;

    React.useEffect(() => {
        if (!canvas.current) {
            return;
        }

        const ctx = canvas.current.getContext('2d')!;
        ctx.save();
        canvasRender(
            ctx,
            { ...state, view: { ...state.view, center: { x: -dx, y: -dy } } },
            w * 2,
            h * 2,
            2,
            {},
            0,
            null,
        );
        ctx.restore();
    }, [state.paths, w, h, dx, dy]);

    const availableColors = useMemo(() => findColors(state), [state.paths]);

    const [url, setUrl] = useState(
        null as null | { time: number; url: string },
    );
    const [laserUrl, setLaserUrl] = useState(
        null as null | { svg: string; url: string },
    );

    // const h =
    //     crop && boundingRect
    //         ? (boundingRect.y2 - boundingRect.y1) *
    //               state.view.zoom +
    //           (crop / 50) * state.meta.ppi
    //         : originalSize;
    // const w =
    //     crop && boundingRect
    //         ? (boundingRect.x2 - boundingRect.x1) *
    //               state.view.zoom +
    //           (crop / 50) * state.meta.ppi
    //         : originalSize;

    return (
        <div>
            <canvas
                ref={canvas}
                width={w * 2}
                height={h * 2}
                style={{
                    width: w,
                    height: h,
                    maxHeight: '60vh',
                    objectFit: 'contain',
                }}
            />
            <div style={{ margin: 8 }}>
                <button
                    onClick={() => {
                        generateLaserInset(state).then((svg) => {
                            if (!bounds) {
                                throw new Error('no bounds');
                            }
                            const blob = new Blob(
                                [
                                    `<svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="${
                                    pxToMM(
                                        bounds.x2 - bounds.x1,
                                        state.meta.ppi,
                                    ).toFixed(1) + 'mm'
                                }"
                                height="${
                                    pxToMM(
                                        bounds.y2 - bounds.y1,
                                        state.meta.ppi,
                                    ).toFixed(1) + 'mm'
                                }"
                                viewBox="0 0 ${w} ${h}"
                            >
                                <path
                                    d="${svg}"
                                    stroke="red"
                                    fill="none"
                                    strokeWidth="2"
                                    transform="translate(${w / 2},${h / 2})"
                                />
                            </svg>`,
                                ],
                                {
                                    type: 'image/svg+xml',
                                },
                            );
                            const url = URL.createObjectURL(blob);
                            setLaserUrl({ svg, url });
                        });
                    }}
                >
                    Generate Laser
                </button>
                <button
                    onClick={() => {
                        const { time, text } = generateGcode(state);
                        const blob = new Blob(
                            [
                                text +
                                    '\n' +
                                    ';; ** STATE **\n;; ' +
                                    JSON.stringify({
                                        ...state,
                                        history: initialState.history,
                                    }),
                            ],
                            { type: 'text/plain' },
                        );
                        setUrl({ time, url: URL.createObjectURL(blob) });
                    }}
                >
                    Generate gcode
                </button>
                {url ? (
                    <>
                        <a
                            onClick={() => setUrl(null)}
                            href={url.url}
                            style={{ color: 'white', margin: '0 8px' }}
                            download={
                                'geo-' + new Date().toISOString() + '-geo.gcode'
                            }
                        >
                            Download the gcode
                        </a>
                        {url.time.toFixed(2)} minutes?
                    </>
                ) : null}
                {laserUrl ? (
                    <>
                        <a
                            onClick={() => setUrl(null)}
                            href={laserUrl.url}
                            style={{ color: 'white', margin: '0 8px' }}
                            download={
                                'geo-' + new Date().toISOString() + '-geo.svg'
                            }
                        >
                            Download the laser svg
                        </a>
                    </>
                ) : null}
                <div>
                    PPI:
                    <BlurInt
                        value={state.meta.ppi}
                        onChange={(ppi) =>
                            ppi
                                ? dispatch({
                                      type: 'meta:update',
                                      meta: { ...state.meta, ppi },
                                  })
                                : null
                        }
                        label={(ppi) => (
                            <div style={{ marginTop: 8, marginBottom: 16 }}>
                                Content Size:{' '}
                                {bounds
                                    ? pxToMM(
                                          bounds.x2 - bounds.x1,
                                          ppi,
                                      ).toFixed(1)
                                    : 'unknown'}
                                {'mm x '}
                                {bounds
                                    ? pxToMM(
                                          bounds.y2 - bounds.y1,
                                          ppi,
                                      ).toFixed(1)
                                    : 'unknown'}
                                {'mm  '}
                                {bounds
                                    ? (
                                          pxToMM(bounds.x2 - bounds.x1, ppi) /
                                          25
                                      ).toFixed(2)
                                    : 'unknown'}
                                {'" x '}
                                {bounds
                                    ? (
                                          pxToMM(bounds.y2 - bounds.y1, ppi) /
                                          25
                                      ).toFixed(2)
                                    : 'unknown'}
                                "
                            </div>
                        )}
                    />
                    Clear Height:
                    <BlurInt
                        value={state.gcode.clearHeight}
                        onChange={(clearHeight) =>
                            clearHeight
                                ? dispatch({
                                      type: 'gcode:config',
                                      config: { clearHeight },
                                  })
                                : null
                        }
                    />
                    Pause Height:
                    <BlurInt
                        value={state.gcode.pauseHeight}
                        onChange={(pauseHeight) =>
                            pauseHeight
                                ? dispatch({
                                      type: 'gcode:config',
                                      config: { pauseHeight },
                                  })
                                : null
                        }
                    />
                </div>
                <div style={{ margin: 16 }}>
                    {state.gcode.items.map((item, i) => {
                        return (
                            <div key={i} style={{ display: 'flex' }}>
                                {item.type === 'pause' ? (
                                    <>
                                        Pause:
                                        <Text
                                            value={item.message}
                                            onChange={(message) =>
                                                dispatch({
                                                    type: 'gcode:item:are',
                                                    item: {
                                                        key: i,
                                                        type: 'edit',
                                                        value: {
                                                            ...item,
                                                            message,
                                                        },
                                                    },
                                                })
                                            }
                                        />
                                    </>
                                ) : (
                                    <ItemEdit
                                        item={item}
                                        state={state}
                                        colors={availableColors}
                                        onChange={(item) =>
                                            dispatch({
                                                type: 'gcode:item:are',
                                                item: {
                                                    key: i,
                                                    type: 'edit',
                                                    value: item,
                                                },
                                            })
                                        }
                                    />
                                )}
                                <button
                                    onClick={() =>
                                        dispatch({
                                            type: 'gcode:item:are',
                                            item: { key: i, type: 'remove' },
                                        })
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={() => {
                        dispatch({
                            type: 'gcode:item:are',
                            item: {
                                key: state.gcode.items.length,
                                type: 'add',
                            },
                        });
                    }}
                >
                    Add Path
                </button>
                <button
                    onClick={() => {
                        dispatch({
                            type: 'gcode:item:are',
                            item: {
                                key: state.gcode.items.length,
                                type: 'add',
                                value: {
                                    type: 'pause',
                                    message: 'Change tool',
                                },
                            },
                        });
                    }}
                >
                    Add Pause
                </button>
            </div>
            {laserUrl && bounds ? (
                // <div dangerouslySetInnerHTML={{ __html: laserUrl.svg }} />
                <svg
                    width={
                        pxToMM(bounds.x2 - bounds.x1, state.meta.ppi).toFixed(
                            1,
                        ) + 'mm'
                    }
                    height={
                        pxToMM(bounds.y2 - bounds.y1, state.meta.ppi).toFixed(
                            1,
                        ) + 'mm'
                    }
                    viewBox={`0 0 ${w} ${h}`}
                >
                    <path
                        d={laserUrl.svg}
                        stroke="red"
                        fill="none"
                        strokeWidth={2}
                        transform={`translate(${w / 2},${h / 2})`}
                    />
                </svg>
            ) : null}
        </div>
    );
};

export type Colors = {
    [key: string]: {
        count: number;
        color: string | number;
        width: number;
    };
};

const findColors = (state: State): Colors => {
    const colors: {
        [key: string]: { count: number; color: string | number; width: number };
    } = {};
    Object.keys(state.paths).forEach((k) => {
        state.paths[k].style.lines.forEach((line) => {
            if (line && line.color != null && line.width != null) {
                const key = line.color + ':' + line.width.toFixed(3);
                if (!colors[key]) {
                    colors[key] = {
                        count: 0,
                        color: line.color!,
                        width: line.width!,
                    };
                }
                colors[key].count += 1;
            }
        });
    });
    return colors;
};

export const ItemEdit = ({
    item,
    onChange,
    colors,
    state,
}: {
    item: GCodePath;
    onChange: (item: GCodePath) => void;
    colors: Colors;
    state: State;
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    const selected = colors[edited?.color ?? item.color];
    return (
        <div>
            <select
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), color: evt.target.value })
                }
                value={edited?.color ?? item.color}
                style={{ marginRight: 8 }}
            >
                <option value="">Select a color</option>
                {Object.keys(colors).map((key) => (
                    <option value={key + ''} key={key}>
                        {paletteColor(
                            state.palettes[state.activePalette],
                            colors[key].color,
                        )}{' '}
                        ({colors[key].count} paths)
                    </option>
                ))}
            </select>
            {selected
                ? pxToMM(selected.width / 100, state.meta.ppi).toFixed(2)
                : 'unknown'}
            mm Bit size
            <span style={{ marginRight: 8 }} /> Speed
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.speed ?? item.speed}
                placeholder="Speed"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), speed: +evt.target.value })
                }
            />
            Depth
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited?.depth ?? item.depth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({ ...(edited ?? item), depth: +evt.target.value })
                }
            />
            Pass Depth
            <input
                style={{
                    width: 40,
                    textAlign: 'center',
                    marginRight: 16,
                    marginLeft: 4,
                }}
                value={edited ? edited.passDepth : item.passDepth}
                placeholder="Depth"
                onChange={(evt) =>
                    setEdited({
                        ...(edited ?? item),
                        passDepth: evt.target.value.length
                            ? +evt.target.value
                            : undefined,
                    })
                }
            />
            {edited != null ? (
                <button
                    onClick={() => {
                        onChange(edited);
                        setEdited(null);
                    }}
                >
                    Save
                </button>
            ) : null}
        </div>
    );
};
export function findColorPaths(insetPaths: Path[]): {
    [key: string]: Array<{ path: Path; style: StyleLine }>;
} {
    const colors: {
        [key: string]: Array<{ path: Path; style: StyleLine }>;
    } = {};
    insetPaths.forEach((path) => {
        if (path.style.lines.length === 1) {
            const line = path.style.lines[0];
            if (!line || line.width == null || line.color == null) {
                return;
            }
            const key = line.color + ':' + line.width.toFixed(3);
            colors[key] = (colors[key] || []).concat([
                {
                    path,
                    style: line!,
                },
            ]);
        }
    });
    return colors;
}
