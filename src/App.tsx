/* @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { Canvas } from './Canvas';
import { MirrorForm } from './Forms';
import { reducer } from './reducer';
import { GuideGeom, guideTypes, initialState } from './types';
export const App = () => {
    const [state, dispatch] = React.useReducer(reducer, initialState);

    React.useEffect(() => {
        const toType: { [key: string]: GuideGeom['type'] } = {
            l: 'Line',
            c: 'Circle',
            a: 'AngleBisector',
            p: 'PerpendicularBisector',
        };
        const fn = (evt: KeyboardEvent) => {
            if (evt.target !== document.body) {
                return;
            }
            if (toType[evt.key]) {
                dispatch({ type: 'pending:type', kind: toType[evt.key] });
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    const ref = React.useRef(null as null | SVGSVGElement);
    const [url, setUrl] = React.useState(null as null | string);

    return (
        <div
            css={{
                padding: 32,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
            }}
        >
            <div>
                Hello folks
                {guideTypes.map((kind) => (
                    <button
                        onClick={() => {
                            dispatch({ type: 'pending:type', kind });
                        }}
                        key={kind}
                    >
                        {kind}
                    </button>
                ))}
                {Object.keys(state.mirrors).map((k) => (
                    <MirrorForm
                        key={k}
                        mirror={state.mirrors[k]}
                        onChange={(mirror) =>
                            dispatch({ type: 'mirror:change', mirror, id: k })
                        }
                    />
                ))}
                <button
                    onClick={() => {
                        const text =
                            ref.current!.outerHTML +
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
            <Canvas
                state={state}
                innerRef={(node) => (ref.current = node)}
                dispatch={dispatch}
                width={1000}
                height={1000}
            />
        </div>
    );
};
