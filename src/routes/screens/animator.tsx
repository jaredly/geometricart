import {useMemo, useState} from 'react';
import {pendingGuide} from '../../editor/RenderPendingGuide';
import {IconEye, IconEyeInvisible, RoundPlus} from '../../icons/Icon';
import {GuideGeomTypes} from '../../types';
import {getAllPatterns, getAnimated, saveAnimated} from '../db.server';
import {useOnOpen} from '../useOnOpen';
import type {Route} from './+types/animator';
import {AnimatedCanvas, calcMargin} from './AnimatedCanvas';
import {SvgCanvas} from './SvgCanvas';
import {LayerDialog} from './animator.screen/LayerDialog';
import {LinesTable} from './animator.screen/LinesTable';
import {SaveLinesButton} from './animator.screen/SaveLinesButton';
import {SimplePreview} from './animator.screen/SimplePreview';
import {Pending, useAnimate, useFetchBounceState} from './animator.screen/animator.utils';

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

export const col = (i: number) => ['red', 'yellow', 'blue'][i % 3];

export default function Animator({loaderData: {patterns, initialState}}: Route.ComponentProps) {
    // const [state, setState] = useLocalStorage<State>('animator-state', {layers: [], lines: []});
    const [hover, setHover] = useState(null as null | number);
    const [state, setState] = useState(initialState);
    const [peg, setPeg] = useState(false);
    const [multi, setMulti] = useState(false);
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

    const [showNice, setShowNice] = useState(false);
    const [canv, setCanv] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const layerDialog = useOnOpen(setShowDialog);

    const peggedZoom = (peg ? calcMargin(preview, state.lines[0]) : 1) * zoom;
    const cache = useMemo(() => ({}), [showNice]);
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
                            peg={peg}
                            multi={multi}
                            cache={cache}
                            repl={repl}
                            showNice={showNice}
                            patternMap={patternMap}
                            preview={preview}
                            zoom={zoom}
                            size={size}
                            state={state}
                            lineWidth={lineWidth}
                        />
                    ) : (
                        <SvgCanvas
                            peggedZoom={peggedZoom}
                            size={size}
                            setPos={setPos}
                            showGuides={showGuides}
                            zoom={zoom}
                            lineWidth={lineWidth}
                            state={state}
                            preview={preview}
                            patternMap={patternMap}
                            pending={pending}
                            pos={pos}
                            setPending={setPending}
                            hover={hover}
                        />
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
                            {lineWidth.toFixed(2)}
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
                        <label className="mx-4">
                            Multi
                            <input
                                type="checkbox"
                                className="checkbox mx-2"
                                disabled={!canv}
                                checked={multi}
                                onChange={() => setMulti(!multi)}
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
