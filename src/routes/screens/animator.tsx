import {useMemo, useState} from 'react';
import {applyTilingTransformsG, tilingPoints} from '../../editor/tilingPoints';
import {tilingTransforms} from '../../editor/tilingTransforms';
import {IconEye, IconEyeInvisible} from '../../icons/Icon';
import {coordKey} from '../../rendering/coordKey';
import {applyMatrices} from '../../rendering/getMirrorTransforms';
import {Coord} from '../../types';
import {getAllPatterns, getAnimated, saveAnimated} from '../db.server';
import {shapeD} from '../shapeD';
import {useOnOpen} from '../useOnOpen';
import type {Route} from './+types/animator';
import {LayerDialog} from './animator.screen/LayerDialog';
import {LinesTable} from './animator.screen/LinesTable';
import {SaveLinesButton} from './animator.screen/SaveLinesButton';
import {SimplePreview} from './animator.screen/SimplePreview';
import {lineAt, Pending, useAnimate, useFetchBounceState} from './animator.screen/animator.utils';

export async function loader({params}: Route.LoaderArgs) {
    const got = getAnimated(params.id);
    if (!got) throw new Error(`Unknown id ${params.id}`);
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
    useFetchBounceState(state);

    const [preview, setPreview] = useState(0);
    const [animate, setAnimate] = useState(false);
    useAnimate(animate, setAnimate, setPreview);

    const [pending, setPending] = useState<null | Pending>(null);
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
    if (pending?.type === 'line') {
        pending.points.forEach((coord) => (pendingPoints[coordKey(coord)] = true));
    }

    const ats = useMemo(
        () => state.lines.map((line) => lineAt(line.keyframes, preview)),
        [state.lines, preview],
    );

    const {full, pts} = useMemo(() => {
        if (!state.layers.length) return {full: [], pts: []};
        const pt = patternMap[state.layers[0].pattern];
        const pts = tilingPoints(pt.shape);
        const ttt = tilingTransforms(pt.shape, pts[2], pts);
        return {
            full: applyTilingTransformsG(ats.filter(Boolean) as Coord[][], ttt, (line, tx) =>
                line.map((coord) => applyMatrices(coord, tx)),
            ),
            pts,
        };
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
                    <path
                        d={shapeD(pts, true)}
                        fill="none"
                        stroke={'white'}
                        strokeWidth={0.01}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
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
                    {pending?.type === 'line'
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
                        <div style={{width: '3em', minWidth: '3em'}}>{preview}</div>
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
                    <div>
                        <button
                            className="btn"
                            onClick={() =>
                                pending
                                    ? setPending(null)
                                    : setPending({
                                          type: 'line',
                                          points: [],
                                      })
                            }
                        >
                            {pending ? 'Cancel' : 'Add new line'}
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
                    </div>
                    <LinesTable
                        state={state}
                        setHover={setHover}
                        preview={preview}
                        setPending={setPending}
                        setState={setState}
                    />
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
