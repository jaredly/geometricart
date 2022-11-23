/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { State } from '../types';
import { Action } from '../state/Action';
import { selectedPathIds } from './touchscreenControls';
import { itemStyle } from '../sidebar/NewSidebar';
import { Checkbox } from 'primereact/checkbox';

export function Clips({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
    const ids = selectedPathIds(state);
    return (
        <div>
            {state.view.activeClip ? (
                <button
                    onClick={() => {
                        dispatch({
                            type: 'clip:cut',
                            clip: state.view.activeClip!,
                        });
                    }}
                >
                    Cut to active clip
                </button>
            ) : null}
            {Object.keys(state.clips).map((id) => (
                <div
                    key={id}
                    className="field-radiobutton hover"
                    style={itemStyle(false)}
                    // onMouseEnter={() =>
                    //     setHover({
                    //         type: 'element',
                    //         kind: 'Mirror',
                    //         id: k,
                    //     })
                    // }
                    onClick={() => {
                        // if (state.activeMirror !== k) {
                        //     dispatch({
                        //         type: 'mirror:active',
                        //         id: k,
                        //     });
                        // } else {
                        //     dispatch({
                        //         type: 'mirror:active',
                        //         id: null,
                        //     });
                        // }
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                activeClip:
                                    state.view.activeClip === id ? null : id,
                            },
                        });
                    }}
                    // onMouseLeave={() => setHover(null)}
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
                </div>

                // <div
                //     key={id}
                //     onClick={() => {
                //         dispatch({
                //             type: 'view:update',
                //             view: {
                //                 ...state.view,
                //                 activeClip:
                //                     state.view.activeClip === id ? null : id,
                //             },
                //         });
                //     }}
                //     css={{
                //         cursor: 'pointer',
                //         padding: 8,
                //         ':hover': {
                //             background: '#555',
                //         },
                //     }}
                //     style={
                //         state.view.activeClip === id
                //             ? {
                //                   border: '1px solid #aaa',
                //               }
                //             : {}
                //     }
                // >
                //     Clip {id}
                // </div>
            ))}
            <div>Select a single shape to clip to it.</div>
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
