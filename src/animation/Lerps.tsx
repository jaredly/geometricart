import React from 'react';
import { BlurInt } from '../editor/Forms';
import { Action } from '../state/Action';
import { FloatLerp, LerpPoint, State } from '../types';
import { PointsEditor, pointsPathD } from './PointsEditor';
import { AddVbl } from './AnimationUI';

export function Lerps({
    dispatch,
    state,
}: {
    dispatch: (action: Action) => unknown;
    state: State;
}) {
    return (
        <div style={{ flex: 1, overflow: 'auto' }}>
            <AddVbl
                onAdd={(key, vbl) => {
                    dispatch({ type: 'timeline:update', key, vbl });
                }}
            />
            {Object.keys(state.animations.lerps).map((key) => {
                const vbl = state.animations.lerps[key];
                if (vbl.type !== 'float') {
                    return 'Not a float, not yet supported';
                }
                return (
                    <FloatLerp
                        key={key}
                        id={key}
                        vbl={vbl}
                        dispatch={dispatch}
                    />
                );
            })}
        </div>
    );
}
function FloatLerp({
    id: key,
    vbl,
    dispatch,
}: {
    id: string;
    vbl: FloatLerp;
    dispatch: (action: Action) => unknown;
}): JSX.Element {
    const [current, setCurrentInner] = React.useState(null as null | FloatLerp);
    const last = React.useRef(vbl.points);
    React.useEffect(() => {
        if (last.current !== vbl.points) {
            last.current = vbl.points;
            setCurrentInner((c) => (c ? { ...c, points: vbl.points } : c));
        }
    }, [vbl.points]);

    if (!current) {
        return (
            <div
                style={{
                    padding: 8,
                    margin: 8,
                    border: '1px solid #aaa',
                }}
            >
                {key}
                <PointsViewer
                    onClick={() => setCurrentInner(vbl)}
                    points={vbl.points}
                />
                <button
                    onClick={() => {
                        dispatch({ type: 'timeline:update', key, vbl: null });
                    }}
                >
                    Delete
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                padding: 8,
                margin: 8,
                border: '1px solid #aaa',
            }}
        >
            {key}
            <button
                onClick={() => {
                    dispatch({
                        type: 'timeline:update',
                        key,
                        vbl: current,
                    });
                    setCurrentInner(null);
                }}
            >
                Save
            </button>
            <button
                onClick={() => {
                    setCurrentInner(null);
                }}
            >
                Cancel
            </button>
            <div>
                Range:
                <BlurInt
                    value={current.range[0]}
                    onChange={(low) => {
                        if (low == null) return;
                        dispatch({
                            type: 'timeline:update',
                            key,
                            vbl: {
                                ...current,
                                range: [low, current.range[1]],
                            },
                        });
                    }}
                />
                <BlurInt
                    value={current.range[1]}
                    onChange={(high) => {
                        if (high == null) return;
                        dispatch({
                            type: 'timeline:update',
                            key,
                            vbl: {
                                ...current,
                                range: [current.range[0], high],
                            },
                        });
                    }}
                />
            </div>
            <PointsEditor
                current={current.points}
                setCurrentInner={(points) =>
                    typeof points === 'function'
                        ? setCurrentInner((v) =>
                              v ? { ...v, points: points(v.points) } : v,
                          )
                        : setCurrentInner((v) => (v ? { ...v, points } : v))
                }
            />
        </div>
    );
}

export const PointsViewer = ({
    points,
    onClick,
}: {
    points: Array<LerpPoint>;
    onClick: () => void;
}) => {
    const width = 50;
    const height = 50;

    const path = pointsPathD(height, points, width);
    return (
        <svg onClick={onClick} width={width} height={height}>
            <path d={path} stroke="red" strokeWidth={1} fill="none" />
        </svg>
    );
};
