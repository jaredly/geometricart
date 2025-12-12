import prettier from 'prettier';
import babel from 'prettier/parser-babel';
import React from 'react';
import {Text} from '../editor/Forms';
import {Action} from '../state/Action';
import {State} from '../types';
import {Editable} from './AnimationUI';

const ScriptEditor = ({
    id,
    code,
    dispatch,
}: {
    id: string;
    code: string;
    dispatch: (acton: Action) => unknown;
}) => {
    const [error, setError] = React.useState(null as null | Error);
    const [open, setOpen] = React.useState(false);
    if (!open) {
        return (
            <div
                onClick={() => setOpen(true)}
                style={{
                    cursor: 'pointer',
                }}
            >
                <button>▶️</button>
                {id}
                <button
                    onClick={() => {
                        if (confirm('really delete')) {
                            dispatch({type: 'script:update', key: id, script: null});
                        }
                    }}
                >
                    🗑️
                </button>
            </div>
        );
    }
    return (
        <div>
            <div>
                <button onClick={() => setOpen(false)} style={{cursor: 'pointer'}}>
                    🔽
                </button>
                <Editable
                    text={id}
                    onChange={(newKey) => {
                        dispatch({
                            type: 'script:rename',
                            key: id,
                            newKey,
                        });
                    }}
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                }}
            >
                <Text
                    key={id}
                    multiline
                    value={code}
                    style={{minHeight: 500}}
                    onChange={(code) => {
                        try {
                            const formatted = prettier.format(code, {
                                plugins: [babel],
                                parser: 'babel',
                            });
                            dispatch({
                                type: 'script:update',
                                key: id,
                                script: {
                                    code: formatted,
                                },
                            });
                            setError(null);
                        } catch (err) {
                            setError(err as Error);
                        }
                    }}
                />
                {error ? (
                    <div
                        style={{
                            background: '#faa',
                            border: '2px solid #f00',
                            padding: 16,
                            margin: 8,
                            width: 400,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                        }}
                    >
                        {error.message}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const newScriptKey = (scripts: {[key: string]: unknown}) => {
    let i = 0;
    while (scripts[`script-${i}`]) {
        i++;
    }
    return `script-${i}`;
};

export const Scripts = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}) => {
    return (
        <div>
            <button
                onClick={() => {
                    dispatch({
                        type: 'script:update',
                        key: newScriptKey(state.animations.scripts),
                        script: {code: `(paths, t) => {\n}`},
                    });
                }}
            >
                Add script
            </button>
            {Object.keys(state.animations.scripts).map((key) => {
                const script = state.animations.scripts[key];
                return <ScriptEditor code={script.code} id={key} dispatch={dispatch} key={key} />;
            })}
        </div>
    );
};
