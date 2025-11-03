import React, {useMemo, useState} from 'react';
import {Action} from '../state/Action';
import {Path, State, Tiling} from '../types';
import {applyMatrices} from '../rendering/getMirrorTransforms';
import {transformSegment} from '../rendering/points';
import {UIDispatch} from '../useUIState';
import {emptyPath} from './RenderPath';
import {tilingTransforms} from './tilingTransforms';
import {handleTiling, simpleExport} from './handleTiling';
import {SimpleTiling} from './SimpleTiling';
import {ShowTiling} from './ShowTiling';
import {normalizeTiling} from '../routes/flipPattern';

export const Tilings = ({
    state,
    dispatch,
    uiDispatch,
}: {
    state: State;
    uiDispatch: UIDispatch;
    dispatch: React.Dispatch<Action>;
}) => {
    const [large, setLarge] = useState(false);
    const normTlings = useMemo(() => {
        return Object.values(state.tilings).map((tiling) => normalizeTiling(tiling));
    }, [state.tilings]);
    return (
        <div>
            {normTlings.map((tiling) => {
                return (
                    <div
                        key={tiling.id}
                        onMouseEnter={() =>
                            uiDispatch({
                                type: 'hover',
                                hover: {
                                    id: tiling.id,
                                    kind: 'Tiling',
                                    type: 'element',
                                },
                            })
                        }
                        onMouseLeave={() => uiDispatch({type: 'hover', hover: null})}
                    >
                        <div>Tiling {tiling.id}</div>
                        <div style={{display: 'flex'}}>
                            <ShowTiling tiling={tiling} />
                            {tiling.shape.type === 'right-triangle' ? (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!tiling.shape.rotateHypotenuse}
                                        onChange={() => {
                                            const sh = tiling.shape as Extract<
                                                Tiling['shape'],
                                                {type: 'right-triangle'}
                                            >;

                                            dispatch({
                                                type: 'tiling:update',
                                                tiling: {
                                                    ...tiling,
                                                    shape: {
                                                        ...sh,
                                                        rotateHypotenuse: !sh.rotateHypotenuse,
                                                    },
                                                },
                                            });
                                        }}
                                    />
                                    Rotate around hypotenuse
                                </label>
                            ) : tiling.shape.type === 'isocelese' ? (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!tiling.shape.flip}
                                        onChange={() => {
                                            const sh = tiling.shape as Extract<
                                                Tiling['shape'],
                                                {type: 'isocelese'}
                                            >;

                                            dispatch({
                                                type: 'tiling:update',
                                                tiling: {
                                                    ...tiling,
                                                    shape: {
                                                        ...sh,
                                                        flip: !sh.flip,
                                                    },
                                                },
                                            });
                                        }}
                                    />
                                    Flip (vs rotate)
                                </label>
                            ) : null}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <button
                                    className="btn"
                                    onClick={() => {
                                        const {bounds, lines, tr} = handleTiling(tiling);
                                        const mx = tilingTransforms(tiling.shape, tr, bounds);

                                        let shapes = tiling.cache.shapes;
                                        mx.forEach((set) => {
                                            shapes = shapes.concat(
                                                ...set.map((s) =>
                                                    shapes.map((shape) => ({
                                                        origin: applyMatrices(shape.origin, s),
                                                        segments: shape.segments.map((seg) =>
                                                            transformSegment(seg, s),
                                                        ),
                                                    })),
                                                ),
                                            );
                                        });
                                        dispatch({
                                            type: 'path:create:many',
                                            paths: shapes.map(
                                                (bare): Path => ({
                                                    ...emptyPath,
                                                    origin: bare.origin,
                                                    segments: bare.segments,
                                                }),
                                            ),
                                            withMirror: false,
                                        });
                                    }}
                                >
                                    Create shapes
                                </button>
                                <button
                                    className="btn"
                                    onClick={async () => {
                                        const cache = simpleExport(state, tiling.shape);
                                        if (!cache) return;

                                        dispatch({
                                            type: 'tiling:update',
                                            tiling: {...tiling, cache},
                                        });
                                    }}
                                >
                                    Recalculate eigenshapes
                                </button>
                            </div>
                        </div>
                        <div style={{fontSize: '70%'}}>{tiling.cache?.hash.slice(0, 10)}</div>
                        <div>
                            {(JSON.stringify(tiling.cache)?.length / 1000).toFixed(2)}
                            kb with shapes,{' '}
                            {(
                                JSON.stringify({
                                    segments: tiling.cache?.segments,
                                    hash: tiling.cache?.hash,
                                }).length / 1000
                            ).toFixed(2)}
                            kb without
                        </div>
                        {tiling.cache ? <SimpleTiling tiling={tiling} /> : null}
                        <button
                            className="btn"
                            onClick={() => {
                                dispatch({
                                    type: 'tiling:delete',
                                    id: tiling.id,
                                });
                            }}
                        >
                            Delete Tiling
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
