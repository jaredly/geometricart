import {useEffect, useMemo, useRef, useState} from 'react';
import {applyTilingTransformsG, tilingPoints} from '../../editor/tilingPoints';
import {getShapeSize, getTilingTransforms, tilingTransforms} from '../../editor/tilingTransforms';
import {AddIcon, IconEye, IconEyeInvisible, RoundPlus} from '../../icons/Icon';
import {coordKey} from '../../rendering/coordKey';
import {applyMatrices, dist} from '../../rendering/getMirrorTransforms';
import {Coord, GuideGeomTypes, Tiling} from '../../types';
import {getAllPatterns, getAnimated, saveAnimated} from '../db.server';
import {shapeD} from '../shapeD';
import {useOnOpen} from '../useOnOpen';
import type {Route} from './+types/animator';
import {LayerDialog} from './animator.screen/LayerDialog';
import {LinesTable} from './animator.screen/LinesTable';
import {SaveLinesButton} from './animator.screen/SaveLinesButton';
import {SimplePreview} from './animator.screen/SimplePreview';
import {
    lineAt,
    Pending,
    useAnimate,
    useFetchBounceState,
    State,
} from './animator.screen/animator.utils';
import {pendingGuide, RenderPendingGuide} from '../../editor/RenderPendingGuide';
import {GuideElement} from '../../editor/GuideElement';
import {geomToPrimitives} from '../../rendering/points';
import {intersections, lineToSlope} from '../../rendering/intersect';
import {pk} from '../pk';
import {getPatternData} from '../getPatternData';
import {drawWoven} from '../canvasDraw';
import {closeEnough} from '../../rendering/epsilonToZero';

export async function loader({params}: Route.LoaderArgs) {
    const got = getAnimated(params.id);
    if (!got) throw new Error(`Unknown id ${params.id}`);
    got.lines.forEach((line) => {
        const needs = line.keyframes.some((l) => !Number.isInteger(l.at));
        if (needs) {
            line.keyframes.forEach((kf, i) => {
                kf.at = i;
            });
        }
    });
    return {
        patterns: getAllPatterns(),
        initialState: got,
    };
}

export async function action({request, params}: Route.ActionArgs) {
    const data = await request.formData();
    const state = data.get('state') as string;
    if (!params.id) throw new Error(`no id`);
    saveAnimated(params.id, state);
}

const col = (i: number) => ['red', 'yellow', 'blue'][i % 3];

export default function Animator({loaderData: {patterns, initialState}}: Route.ComponentProps) {
    // const [state, setState] = useLocalStorage<State>('animator-state', {layers: [], lines: []});
    const [hover, setHover] = useState(null as null | number);
    const [state, setState] = useState(initialState);
    const [peg, setPeg] = useState(false);
    useFetchBounceState(state);

    const [repl, setRepl] = useState(1);
    const [lineWidth, setLineWidth] = useState(2);
    const [showGuides, setShowGuides] = useState(true);

    const [pos, setPos] = useState({x: 0, y: 0});

    const [zoom, setZoom] = useState(4);
    const [preview, setPreview] = useState(0);
    const [animate, setAnimate] = useState(false);
    useAnimate(animate, setAnimate, setPreview, state.layers.length);

    const [pending, setPending] = useState<null | Pending>(null);
    const patternMap = useMemo(
        () => Object.fromEntries(patterns.map((p) => [p.hash, p.tiling])),
        [patterns],
    );
    const size = 600;

    const [showNice, setShowNice] = useState(true);
    const [canv, setCanv] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const layerDialog = useOnOpen(setShowDialog);

    const visiblePoints: Record<string, Coord> = {};
    const add = (c: Coord) => {
        const k = coordKey(c);
        if (!visiblePoints[k]) visiblePoints[k] = c;
    };
    const primitives = state.guides?.flatMap((g) => geomToPrimitives(g)) ?? [];
    primitives.forEach((prim, i) => {
        for (let j = i + 1; j < primitives.length; j++) {
            intersections(prim, primitives[j]).forEach((c) => add(c));
        }
    });
    state.layers.forEach((layer, i) => {
        if (!layer.visible && i !== preview) return;
        patternMap[layer.pattern].cache.segments.forEach(({prev, segment}) => {
            add(prev);
            add(segment.to);
        });
        const pattern = patternMap[layer.pattern];
        const pts = tilingPoints(pattern.shape);
        pts.forEach((p) => add(p));
        const boundLines = pts.map((p, i) => lineToSlope(p, pts[i === 0 ? pts.length - 1 : i - 1]));

        boundLines.forEach((seg) => {
            primitives.forEach((prim) => {
                intersections(seg, prim).forEach((c) => add(c));
            });
        });
    });

    const pendingPoints: Record<string, true> = {};
    if (pending) {
        pending.points.forEach((coord) => (pendingPoints[coordKey(coord)] = true));
    }

    const ats = useMemo(
        () => state.lines.map((line) => lineAt(line.keyframes, preview, line.fade)),
        [state.lines, preview],
    );

    const {full, pts} = useMemo(() => {
        if (!state.layers.length) return {full: [], pts: []};
        const pt = patternMap[state.layers[0].pattern];
        const pts = tilingPoints(pt.shape);
        const ttt = getTilingTransforms(pt.shape, pts);
        return {
            full: applyTilingTransformsG(
                ats.filter(Boolean) as {points: Coord[]; alpha: number}[],
                ttt,
                (line, tx) => ({
                    points: line.points.map((coord) => applyMatrices(coord, tx)),
                    alpha: line.alpha,
                }),
            ),
            pts,
        };
    }, [ats, patternMap, state.layers]);

    const peggedZoom = (peg ? calcMargin(preview, state.lines[0]) : 1) * zoom;
    // const peggedMargin =

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
                <div>
                    {canv ? (
                        <AnimatedCanvas
                            repl={repl}
                            showNice={showNice}
                            patternMap={patternMap}
                            preview={preview}
                            zoom={peggedZoom}
                            size={size}
                            state={state}
                            lineWidth={lineWidth}
                        />
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            // viewBox="-5 -5 10 10"
                            // viewBox="-3 -3 6 6"
                            viewBox={`${-peggedZoom / 2} ${-peggedZoom / 2} ${peggedZoom} ${peggedZoom}`}
                            // viewBox={`${-1 - peggedMargin} ${-1 - peggedMargin} ${2 + peggedMargin * 2} ${2 + peggedMargin * 2}`}
                            // viewBox="-1.5 -1.5 3 3"
                            style={
                                size ? {background: 'black', width: size, height: size} : undefined
                            }
                            onMouseMove={(evt) => {
                                const box = evt.currentTarget.getBoundingClientRect();
                                setPos({
                                    x: ((evt.clientX - box.left) / box.width - 0.5) * 3,
                                    y: ((evt.clientY - box.top) / box.height - 0.5) * 3,
                                });
                            }}
                        >
                            {showGuides && (
                                <path
                                    d={shapeD(pts, true)}
                                    fill="none"
                                    stroke={'white'}
                                    strokeWidth={0.01 * zoom}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                            {full.map((line, i) => (
                                <path
                                    key={i}
                                    d={shapeD(line.points, false)}
                                    fill="none"
                                    // opacity={line.alpha}
                                    stroke={'rgb(205,127,1)'}
                                    strokeWidth={(lineWidth / 200) * peggedZoom * line.alpha}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))}
                            {showGuides &&
                                state.layers.map((layer, i) =>
                                    !layer.visible && i !== preview
                                        ? null
                                        : patternMap[layer.pattern].cache.segments.map(
                                              ({prev, segment}, j) => (
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
                                              ),
                                          ),
                                )}
                            {showGuides &&
                                state.guides?.map((guide, i) => (
                                    <GuideElement
                                        key={i}
                                        geom={guide}
                                        zoom={1}
                                        stroke={0.01}
                                        bounds={{x0: -1, y0: -1, x1: 1, y1: 1}}
                                        original
                                    />
                                ))}
                            {pending?.type === 'line' ? (
                                <path
                                    d={shapeD(pending.points, false)}
                                    fill="none"
                                    stroke={'white'}
                                    strokeWidth={0.03}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ) : null}
                            {pending?.type === 'Guide' ? (
                                <RenderPendingGuide
                                    guide={pending}
                                    zoom={1}
                                    bounds={{x0: -1, y0: -1, x1: 1, y1: 1}}
                                    mirror={null}
                                    shiftKey={false}
                                    stroke={0.01}
                                    pos={pos}
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
                                              setPending({
                                                  ...pending,
                                                  points: [...pending.points, coord],
                                              })
                                          }
                                      />
                                  ))
                                : null}
                            {hover != null && ats[hover] ? (
                                <>
                                    <path
                                        d={shapeD(ats[hover].points, false)}
                                        stroke="white"
                                        strokeWidth={0.04}
                                        fill="none"
                                    />
                                    {ats[hover]?.points.map((coord, i) => (
                                        <circle
                                            key={i}
                                            cx={coord.x.toFixed(3)}
                                            cy={coord.y.toFixed(3)}
                                            r={0.04}
                                            stroke="white"
                                            strokeWidth={0.01}
                                            className="cursor-pointer"
                                            fill={i === 0 ? 'black' : 'red'}
                                        />
                                    ))}
                                </>
                            ) : null}
                        </svg>
                    )}
                </div>
                <div className="flex flex-col gap-4">
                    <label className="flex gap-4 block">
                        <input
                            className="range"
                            type="range"
                            min="0"
                            max={state.layers.length - 1}
                            step={0.01}
                            value={preview}
                            onChange={(evt) => setPreview(+evt.target.value)}
                        />
                        <div style={{width: '3em', minWidth: '3em'}}>{preview.toFixed(2)}</div>
                        <button className="btn" onClick={() => setAnimate(true)}>
                            Animate
                        </button>
                    </label>
                    <div>
                        <label>
                            {'Zoom: 1:'}
                            <input
                                className="input w-20"
                                type="number"
                                min="0"
                                max="3"
                                step={0.01}
                                value={zoom}
                                onChange={(evt) => setZoom(+evt.target.value)}
                            />
                        </label>
                        <label className="ml-4">
                            {'LineWidth'}
                            <input
                                className="range w-40 ml-4"
                                type="range"
                                min="0"
                                max="10"
                                step={0.5}
                                value={lineWidth}
                                onChange={(evt) => setLineWidth(+evt.target.value)}
                            />
                        </label>
                    </div>
                    <div>
                        <label className="ml-4">
                            {'Repl'}
                            <input
                                className="range w-40 ml-4"
                                type="range"
                                min="0"
                                max="10"
                                step={1}
                                value={repl}
                                onChange={(evt) => setRepl(+evt.target.value)}
                            />
                        </label>
                        <label className="mx-4">
                            Woven
                            <input
                                type="checkbox"
                                className="checkbox mx-2"
                                disabled={!canv}
                                checked={showNice && canv}
                                onChange={() => setShowNice(!showNice)}
                            />
                        </label>
                    </div>
                    <details className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        <summary className="mb-4">
                            <div className="inline-flex">
                                <div>Layers</div>
                                <button
                                    className="btn btn-square ml-4"
                                    onClick={() => layerDialog.current?.showModal()}
                                >
                                    <RoundPlus />
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setCanv(!canv);
                                    }}
                                >
                                    {canv ? 'Canvas' : 'SVG'}
                                </button>
                            </div>
                        </summary>
                        <table className="table" style={{display: 'inline'}}>
                            <tbody>
                                {state.layers.map((layer, i) => (
                                    <tr key={i}>
                                        <th>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    setState({
                                                        ...state,
                                                        layers: state.layers.map((l, j) =>
                                                            j === i
                                                                ? {...l, visible: !l.visible}
                                                                : l,
                                                        ),
                                                    });
                                                }}
                                            >
                                                {layer.visible ? (
                                                    <IconEye />
                                                ) : (
                                                    <IconEyeInvisible color={'#555'} />
                                                )}
                                            </button>
                                        </th>
                                        <td
                                            onClick={() => setPreview(i)}
                                            className="cursor-pointer"
                                        >
                                            <SimplePreview
                                                tiling={patternMap[layer.pattern]}
                                                size={80}
                                                color={layer.visible ? col(i) : '#555'}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    const layers = state.layers.slice();
                                                    layers.splice(i, 1);
                                                    layers.splice(i - 1, 0, layer);
                                                    setState({...state, layers});
                                                }}
                                            >
                                                up
                                            </button>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    const layers = state.layers.slice();
                                                    layers.splice(i, 1);
                                                    setState({...state, layers});
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </td>
                                        <td>{JSON.stringify(patternMap[layer.pattern].shape)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </details>
                    <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        <div className="mb-4">
                            Guides
                            <button
                                className="btn"
                                onClick={() => {
                                    setShowGuides(!showGuides);
                                }}
                            >
                                {showGuides ? <IconEye /> : <IconEyeInvisible color={'#555'} />}
                            </button>
                            <ul className="menu ml-4 lg:menu-horizontal bg-base-200 rounded-box">
                                <li>
                                    <details
                                        onClick={(evt) => {
                                            evt.currentTarget.open = !evt.currentTarget.open;
                                        }}
                                    >
                                        <summary onClick={(evt) => evt.stopPropagation()}>
                                            Add Guide
                                        </summary>
                                        <ul className="shadow-md shadow-base-300 z-10">
                                            {Object.entries(GuideGeomTypes).map(([key, name]) => (
                                                <li>
                                                    <button
                                                        onClick={(evt) => {
                                                            // let details: HTMLDetailsElement;
                                                            // let node = evt.currentTarget
                                                            // evt.currentTarget
                                                            setPending({
                                                                type: 'Guide',
                                                                kind: key as 'Line',
                                                                points: [],
                                                                toggle: false,
                                                            });
                                                        }}
                                                    >
                                                        {name === true ? key : name}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                </li>
                            </ul>
                            {pending?.type === 'Guide' && (
                                <>
                                    <button
                                        className="btn btn-square ml-4"
                                        onClick={() => setPending(null)}
                                    >
                                        &times;
                                    </button>
                                    <button
                                        className="btn btn-square ml-4"
                                        onClick={() => {
                                            const guide = pendingGuide(
                                                pending.kind,
                                                pending.points,
                                                false,
                                                undefined,
                                                false,
                                                0,
                                            );
                                            setState({
                                                ...state,
                                                guides: [...(state.guides ?? []), guide],
                                            });
                                            setPending(null);
                                        }}
                                    >
                                        Save
                                    </button>
                                </>
                            )}
                        </div>
                        <table className="table">
                            <tbody>
                                {state.guides?.map((guide, i) => (
                                    <tr key={i}>
                                        <td>{guide.type}</td>
                                        <td>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    setState({
                                                        ...state,
                                                        guides: state.guides?.filter(
                                                            (_, j) => j !== i,
                                                        ),
                                                    });
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
                    <div className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        <div className="mb-4">
                            Lines
                            <button
                                className="btn mx-4"
                                onClick={() =>
                                    pending?.type === 'line'
                                        ? setPending(null)
                                        : setPending({
                                              type: 'line',
                                              points: [],
                                          })
                                }
                            >
                                {pending?.type === 'line' ? <span>&times;</span> : <RoundPlus />}
                            </button>
                            {pending?.type === 'line' && pending.points.length ? (
                                <SaveLinesButton
                                    setPending={setPending}
                                    pending={pending}
                                    setState={setState}
                                    state={state}
                                    preview={preview}
                                />
                            ) : null}
                            <button className="btn mx-4" onClick={() => setPeg(!peg)}>
                                {peg ? 'Unpeg' : 'Peg'}
                            </button>
                        </div>
                        <div className="max-h-80 overflow-auto">
                            <LinesTable
                                state={state}
                                setHover={setHover}
                                preview={preview}
                                setPreview={setPreview}
                                setPending={setPending}
                                setState={setState}
                            />
                        </div>
                    </div>
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

const calcMargin = (preview: number, line: State['lines'][0]) => {
    const lat = lineAt(line.keyframes, preview, line.fade);
    const log = lineAt(line.keyframes, 0, line.fade);
    if (!lat || !log) return 1;
    const d1 = dist(lat.points[0], lat.points[1]);
    const d2 = dist(log.points[0], log.points[1]);
    return d1 / d2;
};

const AnimatedCanvas = ({
    patternMap,
    preview,
    size,
    zoom,
    state,
    lineWidth,
    showNice,
    repl,
}: {
    repl: number;
    showNice: boolean;
    lineWidth: number;
    state: State;
    size: number;
    zoom: number;
    patternMap: Record<string, Tiling>;
    preview: number;
}) => {
    const ats = useMemo(
        () => state.lines.map((line) => lineAt(line.keyframes, preview, line.fade)),
        [state.lines, preview],
    );

    const {full, pts} = useMemo(() => {
        if (!state.layers.length) return {full: [], pts: []};
        const pt = patternMap[state.layers[0].pattern];
        const pts = tilingPoints(pt.shape);
        const ttt = getTilingTransforms(pt.shape, pts, repl);
        return {
            full: applyTilingTransformsG(
                ats.filter(Boolean) as {points: Coord[]; alpha: number}[],
                ttt,
                (line, tx) => ({
                    points: line.points.map((coord) => applyMatrices(coord, tx)),
                    alpha: line.alpha,
                }),
            ),
            pts,
        };
    }, [ats, patternMap, state.layers, repl]);

    const ref = useRef<HTMLCanvasElement>(null);

    const patternDatas = useMemo(() => {
        return state.layers.map((l) => getPatternData(patternMap[l.pattern], false, repl));
    }, [state.layers, patternMap, repl]);

    useEffect(() => {
        if (!ref.current) return;
        const surface = pk.MakeWebGLCanvasSurface(ref.current)!;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        ctx.scale((size * 2) / zoom, (size * 2) / zoom);
        ctx.translate(zoom / 2, zoom / 2);

        if (Number.isInteger(preview) && showNice) {
            drawWoven(ctx, patternDatas[preview], (lineWidth / 200) * zoom);
        } else {
            full.forEach((line) => {
                if (closeEnough(line.alpha, 0)) return;
                const path = pk.Path.MakeFromCmds([
                    pk.MOVE_VERB,
                    line.points[0].x,
                    line.points[0].y,
                    ...line.points.slice(1).flatMap(({x, y}) => [pk.LINE_VERB, x, y]),
                ])!;
                const paint = new pk.Paint();
                paint.setStyle(pk.PaintStyle.Stroke);
                // paint.setAlphaf(line.alpha);
                // paint.setAntiAlias(true);
                // paint.setStrokeWidth((lineWidth / 200) * zoom * 1.5);
                // paint.setColor([0, 0, 0]);
                // ctx.drawPath(path, paint);
                paint.setStrokeJoin(pk.StrokeJoin.Round);
                paint.setStrokeCap(pk.StrokeCap.Round);
                paint.setStrokeWidth((lineWidth / 200) * zoom * line.alpha);
                // paint.setColor([1, 1, 1]);
                paint.setColor([205 / 255, 127 / 255, 1 / 255]);
                paint.setAntiAlias(true);
                paint.setAlphaf(line.alpha);
                ctx.drawPath(path, paint);
            });
        }

        surface.flush();
    }, [patternMap, preview, size, zoom, lineWidth, patternDatas, full, showNice]);
    return (
        <canvas ref={ref} width={size * 2} height={size * 2} style={{width: size, height: size}} />
    );
};
