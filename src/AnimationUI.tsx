import { jsx } from '@emotion/react';
import React from 'react';
import { BlurInt, Text } from './Forms';
import { Animations, State } from './types';
import { Action } from './Action';
import prettier from 'prettier';
import babel from 'prettier/parser-babel';

export function AnimationUI({
    state,
    dispatch,
    animationPosition,
    setAnimationPosition,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
    animationPosition: number;
    setAnimationPosition: React.Dispatch<React.SetStateAction<number>>;
}) {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 400,
                background: 'rgba(0,0,0,0.4)',
                overflow: 'auto',
                display: 'flex',
            }}
        >
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', padding: 8 }}>
                    <button
                        style={{ marginRight: 16 }}
                        onClick={() => {
                            let i = 0;
                            while (state.animations.scripts[`script-${i}`]) {
                                i++;
                            }
                            const newKey = `script-${i}`;
                            dispatch({
                                type: 'script:update',
                                key: newKey,
                                script: {
                                    code: `(paths) => {\n    // do stuff\n}`,
                                    enabled: true,
                                    phase: 'pre-inset',
                                },
                            });
                        }}
                    >
                        Add script
                    </button>
                    <TickTock
                        t={animationPosition}
                        set={setAnimationPosition}
                    />
                </div>
                {Object.keys(state.animations.scripts).map((key) => {
                    const script = state.animations.scripts[key];
                    if (!script.enabled) {
                        return (
                            <div
                                key={key}
                                style={{
                                    padding: 8,
                                    border: '1px solid #aaa',
                                    margin: 8,
                                }}
                            >
                                {key}{' '}
                                <button
                                    onClick={() => {
                                        dispatch({
                                            type: 'script:update',
                                            key,
                                            script: {
                                                ...script,
                                                enabled: true,
                                            },
                                        });
                                    }}
                                >
                                    Enable
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div
                            key={key}
                            style={{
                                padding: 8,
                                border: '1px solid white',
                                margin: 8,
                            }}
                        >
                            <div>{key}</div>
                            <button
                                onClick={() => {
                                    dispatch({
                                        type: 'script:update',
                                        key,
                                        script: {
                                            ...script,
                                            enabled: !script.enabled,
                                        },
                                    });
                                }}
                            >
                                {script.enabled ? 'Disable' : 'Enable'}
                            </button>
                            {script.selection ? (
                                <div>
                                    Current selection:{' '}
                                    {script.selection.ids.length}{' '}
                                    {script.selection.type}
                                    <button
                                        onClick={() => {
                                            dispatch({
                                                type: 'script:update',
                                                key,
                                                script: {
                                                    ...script,
                                                    selection: undefined,
                                                },
                                            });
                                        }}
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    No selection (will apply to all paths)
                                    <button
                                        disabled={!state.selection}
                                        onClick={() => {
                                            const sel = state.selection;
                                            if (
                                                sel?.type === 'PathGroup' ||
                                                sel?.type === 'Path'
                                            ) {
                                                dispatch({
                                                    type: 'script:update',
                                                    key,
                                                    script: {
                                                        ...script,
                                                        selection: sel as any,
                                                    },
                                                });
                                            }
                                        }}
                                    >
                                        Set current selection
                                    </button>
                                </div>
                            )}
                            <div>
                                <Text
                                    key={key}
                                    multiline
                                    value={script.code}
                                    onChange={(code) => {
                                        const formatted = prettier.format(
                                            code,
                                            {
                                                plugins: [babel],
                                            },
                                        );
                                        dispatch({
                                            type: 'script:update',
                                            key,
                                            script: {
                                                ...script,
                                                code: formatted,
                                            },
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <AddVbl
                    onAdd={(key, vbl) => {
                        dispatch({ type: 'timeline:update', key, vbl });
                    }}
                />
                {Object.keys(state.animations.timeline).map((key) => {
                    const vbl = state.animations.timeline[key];
                    if (vbl.type !== 'float') {
                        return 'Not a float, not yet supported';
                    }
                    return (
                        <div
                            key={key}
                            style={{
                                padding: 8,
                                border: '1px solid #aaa',
                            }}
                        >
                            {key}
                            <div>
                                Range:
                                <BlurInt
                                    value={vbl.range[0]}
                                    onChange={(low) => {
                                        if (low == null) return;
                                        dispatch({
                                            type: 'timeline:update',
                                            key,
                                            vbl: {
                                                ...vbl,
                                                range: [low, vbl.range[1]],
                                            },
                                        });
                                    }}
                                />
                                <BlurInt
                                    value={vbl.range[1]}
                                    onChange={(high) => {
                                        if (high == null) return;
                                        dispatch({
                                            type: 'timeline:update',
                                            key,
                                            vbl: {
                                                ...vbl,
                                                range: [vbl.range[0], high],
                                            },
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const AddVbl = ({
    onAdd,
}: {
    onAdd: (name: string, v: Animations['timeline']['']) => void;
}) => {
    const [key, setKey] = React.useState('t');
    const [low, setLow] = React.useState(0);
    const [high, setHigh] = React.useState(1);
    return (
        <div style={{ border: '1px solid #aaa', padding: 8, margin: 8 }}>
            <span>
                Vbl name:{' '}
                <input
                    value={key}
                    onChange={(evt) => setKey(evt.target.value)}
                    placeholder="vbl name"
                />
            </span>
            <span>
                Low:{' '}
                <BlurInt
                    value={low}
                    onChange={(v) => (v != null ? setLow(v) : null)}
                />
            </span>
            <span>
                High:{' '}
                <BlurInt
                    value={high}
                    onChange={(v) => (v != null ? setHigh(v) : null)}
                />
            </span>
            <button
                onClick={() => {
                    onAdd(key, {
                        type: 'float',
                        range: [low, high],
                        points: [],
                    });
                }}
            >
                Add New Vbl
            </button>
        </div>
    );
};

export const TickTock = ({
    t,
    set,
}: {
    t: number;
    set: (t: number) => void;
}) => {
    const [tick, setTick] = React.useState(null as number | null);
    const [increment, setIncrement] = React.useState(0.05);
    React.useEffect(() => {
        if (!tick) {
            return;
        }
        let at = t;
        const id = setInterval(() => {
            at = (at + increment) % 1;
            set(at);
        }, tick);
        return () => clearInterval(id);
    }, [tick, increment]);
    return (
        <div>
            <BlurInt value={t} onChange={(t) => (t ? set(t) : null)} />
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={t + ''}
                onChange={(evt) => set(+evt.target.value)}
            />
            <button onClick={() => setTick(100)}>100ms</button>
            <button onClick={() => setTick(20)}>20ms</button>
            <button onClick={() => setTick(null)}>Clear tick</button>
            <BlurInt
                value={increment}
                onChange={(increment) =>
                    increment ? setIncrement(increment) : null
                }
            />
        </div>
    );
};
