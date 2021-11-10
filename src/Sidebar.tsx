/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import {
    GuideForm,
    MirrorForm,
    PathForm,
    PathGroupForm,
    ViewForm,
} from './Forms';
import { guideTypes, State, Action } from './types';
import { initialHistory, initialState } from './initialState';
import { Export } from './Export';
import { toTypeRev } from './App';

export const PREFIX = `<!-- STATE:`;
export const SUFFIX = '-->';

export const getStateFromFile = (
    file: File,
    done: (s: State | null) => void,
) => {
    const reader = new FileReader();
    reader.onload = () => {
        const last = (reader.result as string).split('\n').slice(-1)[0].trim();
        if (last.startsWith(PREFIX) && last.endsWith(SUFFIX)) {
            done(JSON.parse(last.slice(PREFIX.length, -SUFFIX.length)));
        } else {
            console.log('not last, bad news');
            console.log(last);
            done(null);
        }
    };
    reader.readAsText(file);
};

export function Sidebar({
    dispatch,
    state,
    canvasRef,
}: {
    dispatch: (action: Action) => void;
    state: State;
    canvasRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
    const [dragging, setDragging] = React.useState(false);
    return (
        <div
            style={{
                overflow: 'auto',
                padding: 8,
                background: dragging ? 'white' : '',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
            }}
            // onDragStart={evt => {
            // 	evt.preventDefault()
            // }}
            onDragOver={(evt) => {
                setDragging(true);
                evt.preventDefault();
            }}
            onDragLeave={(evt) => {
                if (evt.target === evt.currentTarget) {
                    setDragging(false);
                    evt.preventDefault();
                }
            }}
            onDrop={(evt) => {
                console.log(evt.dataTransfer.files[0]);
                getStateFromFile(evt.dataTransfer.files[0], (state) => {
                    if (state) {
                        dispatch({ type: 'reset', state });
                    }
                });
                evt.preventDefault();
                setDragging(false);
            }}
        >
            <div>
                <button
                    onClick={() => {
                        dispatch({ type: 'reset', state: initialState });
                    }}
                >
                    Clear All
                </button>
                Hello folks
                <ViewForm
                    view={state.view}
                    onChange={(view) => {
                        dispatch({
                            type: 'view:update',
                            view,
                        });
                    }}
                />
            </div>
            <div>
                {guideTypes.map((kind) => (
                    <button
                        onClick={() => {
                            dispatch({
                                type: 'pending:type',
                                kind,
                            });
                        }}
                        key={kind}
                    >
                        {kind}
                        {toTypeRev[kind] ? ` (${toTypeRev[kind]})` : ''}
                    </button>
                ))}
            </div>
            {Object.keys(state.mirrors).map((k) => (
                <MirrorForm
                    key={k}
                    isActive={state.activeMirror === k}
                    onSelect={() => {
                        dispatch({
                            type: 'mirror:active',
                            id: state.activeMirror === k ? null : k,
                        });
                    }}
                    mirror={state.mirrors[k]}
                    onChange={(mirror) =>
                        dispatch({
                            type: 'mirror:change',
                            mirror,
                            id: k,
                        })
                    }
                />
            ))}
            Guides
            <div
                css={{
                    maxHeight: 400,
                    overflow: 'auto',
                    flexShrink: 1,
                    minHeight: 100,
                }}
            >
                {Object.keys(state.guides).map((k) => (
                    <GuideForm
                        key={k}
                        guide={state.guides[k]}
                        onChange={(guide) =>
                            dispatch({
                                type: 'guide:update',
                                id: k,
                                guide,
                            })
                        }
                    />
                ))}
            </div>
            Groups
            <div
                css={{
                    maxHeight: 400,
                    overflow: 'auto',
                    flexShrink: 1,
                    minHeight: 100,
                }}
            >
                {Object.keys(state.pathGroups).map((k) => (
                    <PathGroupForm
                        key={k}
                        group={state.pathGroups[k]}
                        onChange={(group) =>
                            dispatch({
                                type: 'group:update',
                                id: k,
                                group,
                            })
                        }
                    />
                ))}
            </div>
            Individual Paths
            <div
                css={{
                    maxHeight: 400,
                    overflow: 'auto',
                    flexShrink: 1,
                    minHeight: 100,
                }}
            >
                {Object.keys(state.paths).map((k) => (
                    <PathForm
                        key={k}
                        path={state.paths[k]}
                        onChange={(path) =>
                            dispatch({
                                type: 'path:update',
                                id: k,
                                path,
                            })
                        }
                    />
                ))}
            </div>
            <Export state={state} canvasRef={canvasRef} />
        </div>
    );
}
