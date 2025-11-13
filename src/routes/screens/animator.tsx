import {useMemo, useState} from 'react';
import {pendingGuide} from '../../editor/RenderPendingGuide';
import {CheckmarkIcon, IconEye, IconEyeInvisible, RoundPlus} from '../../icons/Icon';
import {GuideGeomTypes} from '../../types';
import {getAllPatterns, getAnimated, saveAnimated} from '../db.server';
import {useOnOpen} from '../useOnOpen';
import type {Route} from './+types/animator';
import {AnimatedCanvas} from './animator.screen/AnimatedCanvas';
import {calcMargin} from './animator.screen/calcMargin';
import {SVGExports} from './animator.screen/SVGExports';
import {Pending, useFetchBounceState} from './animator.screen/animator.utils';
import {LayerDialog} from './animator.screen/LayerDialog';
import {LinesTable} from './animator.screen/LinesTable';
import {SaveLinesButton} from './animator.screen/SaveLinesButton';
import {SettingsForm} from './animator.screen/SettingsForm';
import {CropPreview, SimplePreview} from './animator.screen/SimplePreview';
import {SvgCanvas} from './animator.screen/SvgCanvas';
import {Canvas} from '@react-three/fiber';
import {ThreedScreenInner} from '../../threed/ThreedScreen';

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

export default function Animator({
    loaderData: {patterns, initialState},
    params,
}: Route.ComponentProps) {
    const [config, setConfig] = useState(initial);

    // const {peg, multi, repl, lineWidth, showGuides, zoom, preview, showNice, size, canv} = config;

    const [hover, setHover] = useState(null as null | number);
    const [state, setState] = useState(initialState);
    useFetchBounceState(state);

    const [pos, setPos] = useState({x: 0, y: 0});

    const [pending, setPending] = useState<null | Pending>(null);
    const patternMap = useMemo(
        () => Object.fromEntries(patterns.map((p) => [p.hash, p.tiling])),
        [patterns],
    );

    const [showDialog, setShowDialog] = useState(false);
    const layerDialog = useOnOpen(setShowDialog);

    const peggedZoom = (config.peg ? calcMargin(config.preview, state.lines[0]) : 1) * config.zoom;

    return (
        <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
            <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 z-10">
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li>
                            <a href="/">Geometric Art</a>
                        </li>
                        <li>
                            <a href="/animator">Animator</a>
                        </li>
                        <li>{params.id}</li>
                    </ul>
                </div>
            </div>
            <div className="gap-4 flex items-start p-4">
                <div>
                    {config.canv ? (
                        <AnimatedCanvas config={config} patternMap={patternMap} state={state} />
                    ) : (
                        <SvgCanvas
                            config={config}
                            peggedZoom={peggedZoom}
                            // size={size}
                            setPos={setPos}
                            // showGuides={showGuides}
                            // zoom={zoom}
                            // lineWidth={lineWidth}
                            state={state}
                            // preview={preview}
                            patternMap={patternMap}
                            pending={pending}
                            pos={pos}
                            setPending={setPending}
                            hover={hover}
                        />
                    )}
                    <SVGExports state={state} config={config} patternMap={patternMap} />
                </div>
                <div className="flex flex-col gap-4">
                    <SettingsForm state={state} config={config} setConfig={setConfig} />
                    <div>
                        <button
                            disabled={!config.canv}
                            className={'btn' + (!config.canv ? ' btn-active' : '')}
                            onClick={() => {
                                setConfig({...config, canv: false});
                            }}
                        >
                            SVG
                        </button>
                        <button
                            disabled={config.canv}
                            className={'btn' + (config.canv ? ' btn-active' : '')}
                            onClick={() => {
                                setConfig({...config, canv: true});
                            }}
                        >
                            Canvas
                        </button>
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
                                            onClick={() => setConfig({...config, preview: i})}
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
                                        {/* <td>{JSON.stringify(patternMap[layer.pattern].shape)}</td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </details>
                    <details className="bg-base-100 p-4 rounded-xl shadow-md shadow-base-300">
                        <summary className="mb-4">
                            <div className="inline-flex">
                                <div>Crops</div>
                                <button
                                    className="btn btn-square ml-4"
                                    onClick={() => setPending({type: 'crop', segments: []})}
                                >
                                    <RoundPlus />
                                </button>
                                {pending?.type === 'crop' && (
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
                                                setState({
                                                    ...state,
                                                    crops: [
                                                        ...(state.crops ?? []),
                                                        {segments: pending.segments},
                                                    ],
                                                });
                                                setPending(null);
                                            }}
                                        >
                                            <CheckmarkIcon />
                                        </button>
                                    </>
                                )}
                            </div>
                        </summary>
                        <table className="table" style={{display: 'inline'}}>
                            <tbody>
                                {state.crops?.map((crop, i) => (
                                    <tr key={i}>
                                        <td
                                            onClick={() => setConfig({...config, preview: i})}
                                            className="cursor-pointer"
                                        >
                                            <CropPreview
                                                segments={crop.segments}
                                                size={80}
                                                color={'#fff'}
                                            />
                                        </td>
                                        <td>
                                            <label>
                                                Hole?
                                                <input
                                                    className="checkbox ml-4"
                                                    type="checkbox"
                                                    checked={!!crop.hole}
                                                    onChange={() => {
                                                        const crops = state.crops!.slice();
                                                        crops[i] = {...crop, hole: !crop.hole};
                                                        setState({...state, crops});
                                                    }}
                                                />
                                            </label>
                                        </td>
                                        <td>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    const crops = state.crops!.slice();
                                                    crops[i] = {...crop, disabled: !crop.disabled};
                                                    setState({...state, crops});
                                                }}
                                            >
                                                {!crop.disabled ? (
                                                    <IconEye />
                                                ) : (
                                                    <IconEyeInvisible color={'#555'} />
                                                )}
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    const crops = state.crops!.slice();
                                                    crops.splice(i, 1);
                                                    setState({...state, crops});
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </td>
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
                                    setConfig({...config, showGuides: !config.showGuides});
                                }}
                            >
                                {config.showGuides ? (
                                    <IconEye />
                                ) : (
                                    <IconEyeInvisible color={'#555'} />
                                )}
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
                                    preview={config.preview}
                                />
                            ) : null}
                            <button
                                className="btn mx-4"
                                onClick={() => setConfig({...config, peg: !config.peg})}
                            >
                                {config.peg ? 'Unpeg' : 'Peg'}
                            </button>
                        </div>
                        <div className="max-h-80 overflow-auto">
                            <LinesTable
                                state={state}
                                setHover={setHover}
                                preview={config.preview}
                                setPreview={(p) => setConfig({...config, preview: p})}
                                setPending={setPending}
                                setState={setState}
                            />
                        </div>
                    </div>
                    <button
                        className="btn"
                        onClick={() => {
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(
                                new Blob([JSON.stringify(state)], {type: 'application/json'}),
                            );
                            a.download = `state-${Date.now()}.json`;
                            a.click();
                        }}
                    >
                        Download JSON
                    </button>
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

const initial: Config = {
    sharp: true,
    peg: false,
    multi: false,
    repl: 1,
    // lineWidth: 10,
    lineWidth: 2,
    showGuides: true,
    zoom: 6,
    preview: 0,
    showNice: false,
    size: 600,
    canv: true,
    bounds: true,
};

export type Config = {
    bounds: boolean;
    sharp: boolean;
    peg: boolean;
    multi: boolean | {count: number; dist: number};
    repl: number;
    lineWidth: number;
    showGuides: boolean;
    zoom: number;
    preview: number;
    showNice: boolean;
    size: number;
    canv: boolean;
};
