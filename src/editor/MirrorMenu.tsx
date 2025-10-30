/* @jsx jsx */
/* @jsxFrag React.Fragment */
import {jsx} from '@emotion/react';
import React from 'react';
import {Id, State} from '../types';
import {Action} from '../state/Action';
import {ShowMirror} from './MirrorForm';
import {DeleteForeverIcon, IconButton, MirrorIcon} from '../icons/Icon';

const MirrorMenu = React.memo(
    ({
        state,
        dispatch,
        transforms,
        onHover,
        onAdd,
    }: {
        onHover: (id: Id | null) => void;
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
                    top: 0,
                    left: 0,
                    // top: 8,
                    // left: 8,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                }}
                onMouseDown={(evt) => {
                    evt.stopPropagation();
                }}
                onClick={(evt) => {
                    evt.stopPropagation();
                }}
            >
                <button
                    onClick={() => setOpen((o) => !o)}
                    onMouseOver={state.activeMirror ? () => onHover(state.activeMirror) : undefined}
                    onMouseOut={state.activeMirror ? () => onHover(null) : undefined}
                    css={{
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        position: 'relative',
                        padding: 8,
                        width: 58,
                        height: 58,
                        display: 'block',
                        color: 'white',
                        // border: '1px solid rgba(255,255,255,0.5)',
                        border: 'none',
                        ':hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                    }}
                >
                    {state.activeMirror ? (
                        <ShowMirror
                            mirror={state.mirrors[state.activeMirror]}
                            transforms={transforms[state.activeMirror]}
                            size={40}
                        />
                    ) : (
                        <MirrorIcon
                            css={{
                                fontSize: 40,
                            }}
                        />
                        // 'No active mirror'
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
                                onMouseOver={() => onHover(k)}
                                onMouseOut={() => onHover(null)}
                                css={{
                                    cursor: 'pointer',
                                    padding: 4,
                                    position: 'relative',
                                    // marginTop: 8,
                                    width: 58,
                                    height: 58,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    border:
                                        '4px solid ' +
                                        (k === state.activeMirror
                                            ? 'rgba(255,255,255,0.8)'
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
                                        setOpen(false);
                                    } else {
                                        dispatch({
                                            type: 'mirror:active',
                                            id: k,
                                        });
                                        setOpen(false);
                                    }
                                    onHover(null);
                                }}
                            >
                                <ShowMirror
                                    mirror={state.mirrors[k]}
                                    transforms={transforms[k]}
                                    size={40}
                                />
                                {k === state.activeMirror ? (
                                    <IconButton
                                        onClick={() => {
                                            dispatch({
                                                type: 'mirror:delete',
                                                id: k,
                                            });
                                        }}
                                        css={{
                                            position: 'absolute',
                                            left: '100%',
                                            top: -4,
                                            marginLeft: 4,
                                            fontSize: 40,
                                        }}
                                    >
                                        <DeleteForeverIcon />
                                    </IconButton>
                                ) : null}
                            </div>
                        ))}
                        <button
                            onClick={(evt) => {
                                evt.stopPropagation();
                                setOpen(false);
                                onAdd();
                            }}
                            css={{
                                width: 58,
                                height: 58,
                                display: 'block',
                                padding: 8,
                                // marginTop: 8,
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
    },
);
