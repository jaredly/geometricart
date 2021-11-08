/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { GuideForm, MirrorForm, PathGroupForm } from './Forms';
import { guideTypes, State, Action } from './types';

const PREFIX = `<!-- STATE:`;
const SUFFIX = '-->';

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
    const [url, setUrl] = React.useState(null as null | string);
    return (
        <div
            style={{
                background: dragging ? 'white' : '',
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
            Hello folks
            <div
                css={{ cursor: 'pointer', padding: 4 }}
                onClick={() =>
                    dispatch({
                        type: 'view:update',
                        view: {
                            ...state.view,
                            guides: !state.view.guides,
                        },
                    })
                }
            >
                Show guides
                <input
                    onClick={(evt) => evt.stopPropagation()}
                    onChange={() => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                guides: !state.view.guides,
                            },
                        });
                    }}
                    type="checkbox"
                    checked={state.view.guides}
                />
            </div>
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
                </button>
            ))}
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
            Groups
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
            <div
                css={{
                    marginTop: 16,
                }}
            >
                <button
                    onClick={() => {
                        const text =
                            canvasRef.current!.outerHTML +
                            `\n\n${PREFIX}${JSON.stringify(state)}${SUFFIX}`;
                        const blob = new Blob([text], {
                            type: 'image/svg+xml',
                        });
                        setUrl(URL.createObjectURL(blob));
                    }}
                >
                    Export
                </button>
                {url
                    ? (() => {
                          const name = `image-${Date.now()}.svg`;
                          return (
                              <div css={{}}>
                                  <div>
                                      <a
                                          href={url}
                                          download={name}
                                          css={{
                                              color: 'white',
                                              background: '#666',
                                              borderRadius: 6,
                                              padding: '4px 8px',
                                              textDecoration: 'none',
                                              cursor: 'pointer',
                                          }}
                                      >
                                          Download {name}
                                      </a>
                                      <button onClick={() => setUrl(null)}>
                                          Close
                                      </button>
                                  </div>
                                  <img src={url} css={{ maxHeight: 400 }} />
                              </div>
                          );
                      })()
                    : null}
            </div>
        </div>
    );
}
