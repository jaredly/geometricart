/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { State } from '../types';
import { Action } from '../state/Action';
import { selectedPathIds } from './touchscreenControls';
import { itemStyle } from '../sidebar/NewSidebar';
import { Checkbox } from 'primereact/checkbox';
import { Hover } from './Sidebar';
import { Button } from 'primereact/button';
import { MagicWandIcon, ScissorsCuttingIcon } from '../icons/Icon';

export function Clips({
    state,
    dispatch,
    setHover,
}: {
    setHover: (hover: Hover | null) => void;
    state: State;
    dispatch: (action: Action) => unknown;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
    const ids = selectedPathIds(state);
    return (
        <div>
            {Object.keys(state.clips).map((id) => (
                <div
                    key={id}
                    className="field-radiobutton hover"
                    style={itemStyle(false)}
                    onMouseEnter={() =>
                        setHover({ type: 'element', kind: 'Clip', id })
                    }
                    onMouseLeave={() => setHover(null)}
                >
                    <Checkbox
                        checked={state.clips[id].active}
                        inputId={id}
                        onClick={(evt) => evt.stopPropagation()}
                        onChange={(evt) => {
                            dispatch({
                                // ergh, this will be ~broken
                                type: 'clip:update',
                                id,
                                clip: {
                                    ...state.clips[id],
                                    active: !state.clips[id].active,
                                },
                            });
                        }}
                        name="mirror"
                        value={id}
                    />
                    <label
                        htmlFor={id}
                        onClick={(evt) => evt.stopPropagation()}
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '80%',
                            cursor: 'pointer',
                        }}
                    >
                        Clip {id}
                    </label>
                    O
                    <Checkbox
                        checked={state.clips[id].outside}
                        inputId={id}
                        onClick={(evt) => evt.stopPropagation()}
                        onChange={(evt) => {
                            dispatch({
                                // ergh, this will be ~broken
                                type: 'clip:update',
                                id,
                                clip: {
                                    ...state.clips[id],
                                    outside: !state.clips[id].outside,
                                },
                            });
                        }}
                        name="mirror"
                        value={id}
                    />
                    Inset
                    <Checkbox
                        checked={state.clips[id].defaultInsetBefore}
                        inputId={id}
                        onClick={(evt) => evt.stopPropagation()}
                        onChange={(evt) => {
                            dispatch({
                                // ergh, this will be ~broken
                                type: 'clip:update',
                                id,
                                clip: {
                                    ...state.clips[id],
                                    defaultInsetBefore:
                                        !state.clips[id].defaultInsetBefore,
                                },
                            });
                        }}
                        name="mirror"
                        value={id}
                    />
                    <div style={{ flex: 1 }} />
                    {state.clips[id].active ? (
                        <>
                            <Button
                                tooltip="Make a shape for clip"
                                onClick={(evt) => {
                                    evt.preventDefault();
                                    const clip = state.clips[id];
                                    dispatch({
                                        type: 'path:create',
                                        segments: clip.shape,
                                        origin: clip.shape[
                                            clip.shape.length - 1
                                        ].to,
                                    });
                                }}
                                tooltipOptions={{ position: 'left' }}
                                className="p-button-text"
                                style={{
                                    marginTop: -7,
                                    marginBottom: -7,
                                }}
                            >
                                <MagicWandIcon />
                            </Button>
                            <Button
                                tooltip="Cut to current clip"
                                onClick={() => {
                                    dispatch({ type: 'clip:cut', clip: id });
                                }}
                                tooltipOptions={{ position: 'left' }}
                                className="p-button-text"
                                style={{
                                    marginTop: -7,
                                    marginBottom: -7,
                                }}
                            >
                                <ScissorsCuttingIcon />
                            </Button>
                        </>
                    ) : null}
                </div>
            ))}
            <div className="p-2">Select a single shape to clip to it.</div>
            {ids.length === 1 ? (
                <button
                    className="mt-2"
                    onClick={() => {
                        dispatch({
                            type: 'clip:add',
                            clip: state.paths[ids[0]].segments,
                        });
                    }}
                >
                    Add clip
                </button>
            ) : null}
            {/* {Object.keys()} */}
        </div>
    );
}
