import type {Route} from './+types/animator';
import React, {useRef} from 'react';
import {getAllPatterns, getAnimated, getCachedPatternData, saveAnimated} from '../db.server';
import {Coord, Tiling} from '../../types';
import {useLocalStorage} from '../../vest/useLocalStorage';
import {useEffect, useMemo, useState} from 'react';
import {shapeD} from '../shapeD';
import {useOnOpen} from '../useOnOpen';
import {coordKey} from '../../rendering/coordKey';
import {plerp} from '../../plerp';
import {tilingTransforms} from '../../editor/tilingTransforms';
import {applyTilingTransformsG, tilingPoints} from '../../editor/tilingPoints';
import {applyMatrices} from '../../rendering/getMirrorTransforms';
import {IconEye, IconEyeInvisible} from '../../icons/Icon';
import {useFetcher} from 'react-router';

export async function loader({params}: Route.LoaderArgs) {
    const got = getAnimated(params.id);
    if (!got) throw new Error(`Unknown id ${params.id}`);
    return {
        patterns: getAllPatterns(),
        initialState: got,
    };
}

export type State = {
    layers: {pattern: string; visible: boolean}[];
    lines: {
        keyframes: {
            at: number;
            points: Coord[];
        }[];
    }[];
};

const findExtraPoints = (line: Coord[], count: number) => {
    const first = line.slice(0, -1);
    const next = line[line.length - 2];
    const last = line[line.length - 1];
    const dx = (last.x - next.x) / (count + 1);
    const dy = (last.y - next.y) / (count + 1);
    for (let i = 1; i <= count; i++) {
        first.push({x: next.x + dx * i, y: next.y + dy * i});
    }
    first.push(last);
    return first;
};

const lineAt = (frames: {at: number; points: Coord[]}[], at: number) => {
    const exact = frames.find((f) => f.at === at);
    if (exact) return exact.points;
    const after = frames.findIndex((f) => f.at > at);
    if (after === 0 || after === -1) return;
    let prev = frames[after - 1];
    let post = frames[after];
    const btw = (at - prev.at) / (post.at - prev.at);
    let left = prev.points;
    let right = post.points;
    if (left.length < right.length) left = findExtraPoints(left, right.length - left.length);
    if (right.length < left.length) right = findExtraPoints(right, left.length - right.length);
    return left.map((p, i) => plerp(p, right[i], btw));
};

const SimplePreview = React.memo(
    ({tiling, size, color}: {color: string; tiling: Tiling; size: number}) => {
        const all = useMemo(() => {
            const pts = tilingPoints(tiling.shape);
            const ttt = tilingTransforms(tiling.shape, pts[2], pts);

            return applyTilingTransformsG(
                tiling.cache.segments.map((s) => [s.prev, s.segment.to]),
                ttt,
                (line, tx) => line.map((coord) => applyMatrices(coord, tx)),
            );
        }, [tiling]);
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="-1.5 -1.5 3 3"
                style={{background: 'black', width: size, height: size}}
            >
                {all.map((line, i) => (
                    <path
                        key={i}
                        d={shapeD(line, false)}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.02}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
        );
    },
);

const col = (i: number) => ['red', 'yellow', 'blue'][i % 3];

export async function action({request, params}: Route.ActionArgs) {
    const data = await request.formData();
    const state = data.get('state') as string;
    if (!params.id) throw new Error(`no id`);
    saveAnimated(params.id, state);
}

const debounce = (act: () => void, wait: number, max: number) => {
    let last = 0;
    let tid: NodeJS.Timeout | null = null;
    return () => {
        if (tid) {
            clearTimeout(tid);
            tid = null;
        }
        if (Date.now() - last > max) {
            last = Date.now();
            act();
            return;
        }
        tid = setTimeout(() => {
            last = Date.now();
            tid = null;
            act();
        }, wait);
    };
};

export default function Animator({loaderData: {patterns, initialState}}: Route.ComponentProps) {
    // const [state, setState] = useLocalStorage<State>('animator-state', {layers: [], lines: []});
    const [hover, setHover] = useState(null as null | number);

    const fetcher = useFetcher();

    const [state, setState] = useState(initialState);

    const fref = useRef(fetcher);
    const firstLoad = useRef(true);
    const latest = useRef(state);
    latest.current = state;

    const bouncer = useMemo(
        () =>
            debounce(
                () =>
                    fref.current.submit({state: JSON.stringify(latest.current)}, {method: 'POST'}),
                300,
                5000,
            ),
        [],
    );

    useEffect(() => {
        if (firstLoad.current) {
            firstLoad.current = false;
            return;
        }

        const _changed = state;
        console.log('we have a state it is here');
        // persist!
        bouncer();
    }, [state, bouncer]);

    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (!animate) return;
        let at = 0;
        let it = setInterval(() => {
            at += 0.01;
            if (at >= 1) {
                clearInterval(it);
                setAnimate(false);
            }
            setPreview(1 - (Math.cos(at * Math.PI * 2) + 1) / 2);
        }, 40);

        return () => clearInterval(it);
    }, [animate]);

    const [preview, setPreview] = useState(0);
    const [pending, setPending] = useState<null | {selected?: number; points: Coord[]}>(null);
    const patternMap = useMemo(
        () => Object.fromEntries(patterns.map((p) => [p.hash, p.tiling])),
        [patterns],
    );
    const size = 600;

    const [showDialog, setShowDialog] = useState(false);
    const layerDialog = useOnOpen(setShowDialog);

    const visiblePoints: Record<string, Coord> = {};
    const add = (c: Coord) => {
        const k = coordKey(c);
        if (!visiblePoints[k]) visiblePoints[k] = c;
    };
    state.layers.forEach((layer) => {
        if (!layer.visible) return;
        patternMap[layer.pattern].cache.segments.forEach(({prev, segment}) => {
            add(prev);
            add(segment.to);
        });
    });
    const pendingPoints: Record<string, true> = {};
    pending?.points.forEach((coord) => (pendingPoints[coordKey(coord)] = true));

    const ats = useMemo(
        () => state.lines.map((line) => lineAt(line.keyframes, preview)),
        [state.lines, preview],
    );

    const full = useMemo(() => {
        const pt = patternMap[state.layers[0].pattern];
        const pts = tilingPoints(pt.shape);
        const ttt = tilingTransforms(pt.shape, pts[2], pts);
        return applyTilingTransformsG(ats.filter(Boolean) as Coord[][], ttt, (line, tx) =>
            line.map((coord) => applyMatrices(coord, tx)),
        );
    }, [ats, patternMap, state.layers]);

    return (
        <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
            <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 z-10">
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li>
                            <a href="/">Geometric Art</a>
                        </li>
                        <li>Animator</li>
                    </ul>
                </div>
            </div>
            <div className="gap-4 flex items-start p-4">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    // viewBox="-5 -5 10 10"
                    // viewBox="-3 -3 6 6"
                    viewBox="-1.5 -1.5 3 3"
                    style={size ? {background: 'black', width: size, height: size} : undefined}
                >
                    {full.map((line, i) => (
                        <path
                            key={i}
                            d={shapeD(line, false)}
                            fill="none"
                            stroke={'#555'}
                            strokeWidth={0.03}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}
                    {state.layers.map((layer, i) =>
                        !layer.visible
                            ? null
                            : patternMap[layer.pattern].cache.segments.map(({prev, segment}, j) => (
                                  <path
                                      key={`${i}-${j}`}
                                      d={shapeD([prev, segment.to], false)}
                                      fill="none"
                                      stroke={col(i)}
                                      //   opacity={0.5}
                                      strokeWidth={0.03}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                  />
                              )),
                    )}
                    {pending ? (
                        <path
                            d={shapeD(pending?.points, false)}
                            fill="none"
                            stroke={'white'}
                            strokeWidth={0.03}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ) : null}
                    {pending
                        ? Object.entries(visiblePoints).map(([key, coord]) => (
                              <circle
                                  key={key}
                                  cx={coord.x.toFixed(3)}
                                  cy={coord.y.toFixed(3)}
                                  r={0.04}
                                  className="cursor-pointer"
                                  fill={pendingPoints[key] ? 'orange' : 'white'}
                                  opacity={0.7}
                                  onClick={() =>
                                      setPending({...pending, points: [...pending.points, coord]})
                                  }
                              />
                          ))
                        : null}
                    {/* {ats.map((at, i) =>
                        at ? (
                            <path
                                d={shapeD(at, false)}
                                fill="none"
                                stroke={hover === i ? 'yellow' : 'green'}
                                strokeWidth={0.01}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ) : null,
                    )} */}
                    {hover
                        ? ats[hover]?.map((coord, i) => (
                              <circle
                                  key={i}
                                  cx={coord.x.toFixed(3)}
                                  cy={coord.y.toFixed(3)}
                                  r={0.03}
                                  className="cursor-pointer"
                                  fill={i === 0 ? 'red' : 'orange'}
                              />
                          ))
                        : null}
                </svg>
                <div>
                    <label className="flex gap-4 block">
                        <input
                            className="range"
                            type="range"
                            min="0"
                            max="1"
                            step={0.01}
                            value={preview}
                            onChange={(evt) => setPreview(+evt.target.value)}
                        />
                        <div className="w-10">{preview}</div>
                        <button className="btn" onClick={() => setAnimate(true)}>
                            Animate
                        </button>
                    </label>
                    <div>Layers</div>
                    <table className="table" style={{display: 'inline'}}>
                        <tbody>
                            <tr>
                                <th></th>
                                <td>
                                    <button
                                        className="btn"
                                        onClick={() => layerDialog.current?.showModal()}
                                    >
                                        Add new layer
                                    </button>
                                </td>
                            </tr>
                            {state.layers.map((layer, i) => (
                                <tr key={i}>
                                    <th>
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                setState({
                                                    ...state,
                                                    layers: state.layers.map((l, j) =>
                                                        j === i ? {...l, visible: !l.visible} : l,
                                                    ),
                                                });
                                            }}
                                        >
                                            {layer.visible ? <IconEye /> : <IconEyeInvisible />}
                                        </button>
                                    </th>
                                    <td>
                                        <SimplePreview
                                            tiling={patternMap[layer.pattern]}
                                            size={80}
                                            color={layer.visible ? col(i) : 'white'}
                                        />
                                        {/* {layer.pattern.slice(0, 10)} */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div>Lines</div>
                    <table className="table">
                        <tbody>
                            <tr>
                                <td className="flex" rowSpan={3}>
                                    <button
                                        className="btn"
                                        onClick={() =>
                                            pending
                                                ? setPending(null)
                                                : setPending({
                                                      points: [],
                                                  })
                                        }
                                    >
                                        {pending ? 'Cancel' : 'Add new line'}
                                    </button>
                                    {pending?.points.length && pending.points.length > 1 ? (
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                setPending(null);
                                                if (pending.selected != null) {
                                                    setState({
                                                        ...state,
                                                        lines: state.lines.map((line, i) =>
                                                            i === pending.selected
                                                                ? line.keyframes.some(
                                                                      (k) => k.at === preview,
                                                                  )
                                                                    ? {
                                                                          ...line,
                                                                          keyframes:
                                                                              line.keyframes.map(
                                                                                  (k) =>
                                                                                      k.at ===
                                                                                      preview
                                                                                          ? {
                                                                                                ...k,
                                                                                                points: pending.points,
                                                                                            }
                                                                                          : k,
                                                                              ),
                                                                      }
                                                                    : {
                                                                          ...line,
                                                                          keyframes: [
                                                                              ...line.keyframes,
                                                                              {
                                                                                  at: preview,
                                                                                  points: pending.points,
                                                                              },
                                                                          ].sort(
                                                                              (a, b) => a.at - b.at,
                                                                          ),
                                                                      }
                                                                : line,
                                                        ),
                                                    });
                                                } else {
                                                    setState({
                                                        ...state,
                                                        lines: [
                                                            ...state.lines,
                                                            {
                                                                keyframes: [
                                                                    {
                                                                        at: preview,
                                                                        points: pending.points,
                                                                    },
                                                                ],
                                                            },
                                                        ],
                                                    });
                                                }
                                            }}
                                        >
                                            Finish
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                            {state.lines.map((line, i) => (
                                <tr
                                    key={i}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                >
                                    <td>Line #{i + 1}</td>
                                    <td>
                                        <svg style={{width: 110, height: 20}}>
                                            <line
                                                x1={
                                                    Math.min(...line.keyframes.map((k) => k.at)) *
                                                        100 +
                                                    5
                                                }
                                                x2={
                                                    Math.max(...line.keyframes.map((k) => k.at)) *
                                                        100 +
                                                    5
                                                }
                                                y1={10}
                                                y2={10}
                                                stroke={'#555'}
                                                strokeWidth={1}
                                            />
                                            {line.keyframes.map((kf) => (
                                                <circle
                                                    cx={kf.at * 100 + 5}
                                                    cy={10}
                                                    r={5}
                                                    fill={kf.at === preview ? 'white' : 'red'}
                                                    key={kf.at}
                                                />
                                            ))}
                                        </svg>
                                    </td>
                                    <td>
                                        <button
                                            className="btn"
                                            onClick={() => setPending({selected: i, points: []})}
                                        >
                                            +
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                if (line.keyframes.length === 1) {
                                                    setState({
                                                        ...state,
                                                        lines: state.lines.filter(
                                                            (_, j) => j !== i,
                                                        ),
                                                    });
                                                } else {
                                                    let next = line.keyframes.findIndex(
                                                        (f) => f.at >= preview,
                                                    );
                                                    if (next === -1)
                                                        next = line.keyframes.length - 1;
                                                    const lines = state.lines.slice();
                                                    lines[i] = {
                                                        ...line,
                                                        keyframes: line.keyframes.filter(
                                                            (_, k) => k !== next,
                                                        ),
                                                    };
                                                    setState({...state, lines});
                                                }
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <dialog id="layer-modal" className="modal" ref={layerDialog}>
                {showDialog ? (
                    <LayerDialog
                        patterns={patterns.map((p) => p.hash)}
                        addLayer={(hash) =>
                            setState((s) => ({
                                ...s,
                                layers: [...s.layers, {pattern: hash, visible: true}],
                            }))
                        }
                    />
                ) : null}
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}

const LayerDialog = ({
    addLayer,
    patterns,
}: {
    addLayer: (hash: string) => void;
    patterns: string[];
}) => {
    return (
        <div className="modal-box flex flex-col w-11/12 max-w-5xl h-full max-h-full overflow-auto">
            <form method="dialog" className="contents">
                <div className="mb-4">
                    <input className="input mr-4" type="text" name="id" />
                    <button
                        className="btn"
                        onClick={(evt) => {
                            const data = new FormData(evt.currentTarget.form!);
                            const id = data.get('id') as string;
                            if (id && patterns.includes(id)) {
                                addLayer(id);
                            }
                        }}
                    >
                        Add by id
                    </button>
                </div>
                <div className="flex flex-wrap gap-4">
                    {patterns.map((hash) => (
                        <button
                            onClick={() => {
                                addLayer(hash);
                            }}
                        >
                            <img
                                src={`/gallery/pattern/${hash}/320.png`}
                                className="w-40 h-40"
                                key={hash}
                            />
                        </button>
                    ))}
                </div>
            </form>
        </div>
    );
};
