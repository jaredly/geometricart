/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { MirrorForm } from './Forms';
import { guideTypes, State, Action } from './types';

export function Sidebar({
    dispatch,
    state,
    canvasRef,
}: {
    dispatch: (action: Action) => void;
    state: State;
    canvasRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
    const [url, setUrl] = React.useState(null as null | string);
    return (
        <div>
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
            <button
                onClick={() => {
                    const text =
                        canvasRef.current!.outerHTML +
                        `\n\n<!-- STATE: ${JSON.stringify(state)} --> `;
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
    );
}
