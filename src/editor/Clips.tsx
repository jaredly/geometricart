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
import { ScissorsCuttingIcon } from '../icons/Icon';

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
                    onClick={() => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                activeClip:
                                    state.view.activeClip === id ? null : id,
                            },
                        });
                    }}
                    onMouseLeave={() => setHover(null)}
                >
                    <Checkbox
                        checked={state.view.activeClip === id}
                        inputId={id}
                        onClick={(evt) => evt.stopPropagation()}
                        onChange={(evt) => {
                            dispatch({
                                type: 'view:update',
                                view: {
                                    ...state.view,
                                    activeClip:
                                        state.view.activeClip === id
                                            ? null
                                            : id,
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
                            flex: 1,
                        }}
                    >
                        Clip {id}
                    </label>
                    {state.view.activeClip === id ? (
                        <Button
                            tooltip="Cut to current clip"
                            onClick={() => {
                                dispatch({
                                    type: 'clip:cut',
                                    clip: state.view.activeClip!,
                                });
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
