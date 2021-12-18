/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action, State } from './types';
import { ShowMirror } from './MirrorForm';

export const MirrorMenu = ({
    state,
    dispatch,
    transforms,
    onAdd,
}: {
    state: State;
    dispatch: (action: Action) => void;
    transforms: any;
    onAdd: () => void;
}) => {
    const [isOpen, setOpen] = React.useState(false);
    return (
        <div
            css={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(0,0,0,0.2)',
            }}
        >
            <button
                onClick={() => setOpen((o) => !o)}
                css={{
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 8,
                    width: 66,
                    height: 66,
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.5)',
                    ':hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                }}
            >
                {state.activeMirror ? (
                    <ShowMirror
                        mirror={state.mirrors[state.activeMirror]}
                        transforms={transforms[state.activeMirror]}
                        size={50}
                    />
                ) : (
                    'No mirror'
                )}
                <div
                    css={{
                        position: 'absolute',
                        bottom: 0,
                        right: 6,
                        color: 'white',
                        display: 'flex',
                        fontSize: 30,
                        opacity: 0.3,
                    }}
                >
                    ⚙
                </div>
            </button>
            {isOpen ? (
                <div>
                    {Object.keys(state.mirrors).map((k) => (
                        <div
                            key={k}
                            css={{
                                cursor: 'pointer',
                                padding: 8,
                                position: 'relative',
                                marginTop: 8,
                                border:
                                    '1px solid ' +
                                    (k === state.activeMirror
                                        ? 'white'
                                        : 'transparent'),
                                ':hover': {
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                },
                            }}
                            onClick={() => {
                                if (k === state.activeMirror) {
                                    dispatch({
                                        type: 'mirror:active',
                                        id: null,
                                    });
                                } else {
                                    dispatch({ type: 'mirror:active', id: k });
                                }
                            }}
                        >
                            <ShowMirror
                                mirror={state.mirrors[k]}
                                transforms={transforms[k]}
                                size={50}
                            />
                            {k === state.activeMirror ? (
                                <button
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                        // dispatch({type: 'mirror:delete', id: k})
                                    }}
                                    css={{
                                        position: 'absolute',
                                        left: '100%',
                                        top: -1,
                                        width: 68,
                                        height: 68,
                                        display: 'block',
                                        padding: 8,
                                        marginLeft: 8,
                                        fontSize: 40,
                                        backgroundColor: 'transparent',
                                        color: 'white',
                                        cursor: 'pointer',
                                        border: '1px solid white',
                                        ':hover': {
                                            backgroundColor:
                                                'rgba(255,255,255,0.1)',
                                        },
                                    }}
                                >
                                    -
                                </button>
                            ) : null}
                        </div>
                    ))}
                    <button
                        onClick={(evt) => {
                            evt.stopPropagation();
                            setOpen(false);
                            onAdd();
                            // dispatch({type: 'mirror:delete', id: k})
                        }}
                        css={{
                            position: 'absolute',
                            left: '100%',
                            top: -1,
                            width: 68,
                            height: 68,
                            display: 'block',
                            padding: 8,
                            marginLeft: 8,
                            fontSize: 40,
                            backgroundColor: 'transparent',
                            color: 'white',
                            cursor: 'pointer',
                            border: '1px solid white',
                            ':hover': {
                                backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                        }}
                    >
                        +
                    </button>
                </div>
            ) : null}
        </div>
    );
};
