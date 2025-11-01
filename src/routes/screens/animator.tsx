import type {Route} from './+types/animator';
import {getAllPatterns, getCachedPatternData} from '../db.server';
import {Coord} from '../../types';
import {useLocalStorage} from '../../vest/useLocalStorage';
import {useEffect, useState} from 'react';
import {shapeD} from '../shapeD';
import {useOnOpen} from '../useOnOpen';
import {coordKey} from '../../rendering/coordKey';

export async function loader({params}: Route.LoaderArgs) {
    return {
        patterns: getAllPatterns(),
    };
}

type State = {
    layers: {pattern: string; visible: boolean}[];
    lines: {
        keyframes: {
            at: number;
            points: Coord[];
        }[];
    }[];
};

export default function Wrapper(props: Route.ComponentProps) {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => setLoaded(true), []);
    return loaded ? <Animator {...props} /> : null;
}

function Animator({loaderData: {patterns}}: Route.ComponentProps) {
    const [state, setState] = useLocalStorage<State>('animator-state', {layers: [], lines: []});

    const [preview, setPreview] = useState(0);
    const [pending, setPending] = useState<null | {selected?: number; points: Coord[]}>(null);
    const patternMap = Object.fromEntries(patterns.map((p) => [p.hash, p.tiling]));
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
                    {state.layers.map((layer, i) =>
                        !layer.visible
                            ? null
                            : patternMap[layer.pattern].cache.segments.map(({prev, segment}, j) => (
                                  <path
                                      key={`${i}-${j}`}
                                      d={shapeD([prev, segment.to], false)}
                                      fill="none"
                                      stroke={['red', 'yellow', 'blue'][i % 3]}
                                      opacity={0.5}
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
                    </label>
                    <div>Layers</div>
                    <table className="table">
                        <tbody>
                            <tr>
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
                                    <td>{layer.pattern.slice(0, 10)}</td>
                                    <td>
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
                                            {layer.visible ? 'hide' : 'show'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div>Lines</div>
                    <table className="table">
                        <tbody>
                            <tr>
                                <td>
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
                                <tr key={i}>
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
                                            onClick={() =>
                                                setState({
                                                    ...state,
                                                    lines: state.lines.filter((_, j) => j !== i),
                                                })
                                            }
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
