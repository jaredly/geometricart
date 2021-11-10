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
import { guideTypes, State, Action, Tab, Id } from './types';
import { initialHistory, initialState } from './initialState';
import { Export } from './Export';
import { toTypeRev } from './App';
import { useDropTarget } from './useDropTarget';
import { ExportPalettes, ImportPalettes } from './ExportPalettes';

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

export const Tabs = ({
    current,
    tabs,
    onSelect,
    props,
}: {
    props: TabProps;
    onSelect: (name: string) => void;
    current: string;
    tabs: { [key: string]: (props: TabProps) => React.ReactNode };
}) => {
    return (
        <div css={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {Object.keys(tabs).map((name) => (
                    <div
                        css={{
                            cursor: 'pointer',
                            backgroundColor: '#444',
                            margin: 4,
                            padding: '4px 8px',
                            ':hover': {
                                backgroundColor: 'white',
                                color: 'black',
                            },
                        }}
                        style={
                            name === current
                                ? {
                                      backgroundColor: 'white',
                                      color: 'black',
                                  }
                                : {}
                        }
                        key={name}
                        onClick={() => onSelect(name)}
                    >
                        {name}
                    </div>
                ))}
            </div>
            {tabs[current](props)}
        </div>
    );
};

export type Hover = {
    kind: 'Path' | 'PathGroup' | 'Mirror' | 'Guide';
    id: Id;
};

export type TabProps = {
    state: State;
    dispatch: (action: Action) => unknown;
    canvasRef: { current: SVGSVGElement | null };
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
};
const tabs: { [key in Tab]: (props: TabProps) => React.ReactNode } = {
    Guides: ({ state, dispatch, hover, setHover }) => {
        return (
            <div
                css={{
                    overflow: 'auto',
                    flexShrink: 1,
                    minHeight: 100,
                }}
            >
                {Object.keys(state.guides).map((k) => (
                    <GuideForm
                        onMouseOut={() => setHover(null)}
                        onMouseOver={() => setHover({ kind: 'Guide', id: k })}
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
        );
    },
    PathGroups: ({ state, dispatch, hover, setHover }) => {
        return (
            <div
                css={{
                    overflow: 'auto',
                    flexShrink: 1,
                    minHeight: 100,
                }}
            >
                {Object.keys(state.pathGroups).map((k) => (
                    <PathGroupForm
                        palette={state.palettes[state.activePalette]}
                        key={k}
                        group={state.pathGroups[k]}
                        onMouseOver={() => {
                            setHover({ kind: 'PathGroup', id: k });
                        }}
                        onMouseOut={() => setHover(null)}
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
        );
    },
    Paths: ({ state, dispatch }) => (
        <div
            css={{
                overflow: 'auto',
                flex: 1,
                minHeight: 100,
            }}
        >
            {Object.keys(state.paths).map((k) => (
                <PathForm
                    key={k}
                    palette={state.palettes[state.activePalette]}
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
    ),
    Mirrors: ({ state, dispatch }) => {
        return (
            <div
                css={{
                    overflow: 'auto',
                    flexShrink: 1,
                    minHeight: 100,
                }}
            >
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
            </div>
        );
    },
    Export: ({ state, canvasRef }) => (
        <Export state={state} canvasRef={canvasRef} />
    ),
    Palette: ({ state, dispatch }) => (
        <div>
            {Object.keys(state.palettes).map((name) => (
                <div
                    key={name}
                    style={{
                        border:
                            state.activePalette === name
                                ? `1px solid white`
                                : `1px solid transparent`,
                    }}
                    onClick={() => dispatch({ type: 'palette:select', name })}
                >
                    {name}
                    <div css={{ display: 'flex', flexDirection: 'row' }}>
                        {state.palettes[name].map((color, i) => (
                            <div
                                key={i}
                                style={{
                                    backgroundColor: color,
                                    width: 20,
                                    height: 20,
                                }}
                            ></div>
                        ))}
                    </div>
                </div>
            ))}
            <input
                onPaste={(evt) => {
                    const data = evt.clipboardData.getData('text/plain');
                    const parts = data
                        .split(',')
                        .map((m) =>
                            m.trim().match(/^[0-9a-f]{6}$/)
                                ? '#' + m.trim()
                                : m.trim(),
                        );
                    console.log(parts);
                    let num = Object.keys(state.palettes).length;
                    while (state.palettes[`palette${num}`]) {
                        num += 1;
                    }
                    let newName = `palette${num}`;
                    dispatch({
                        type: 'palette:update',
                        name: newName,
                        colors: parts,
                    });
                }}
                value=""
                onChange={() => {}}
                placeholder="Paste comma-separated colors"
            />
            <ExportPalettes palettes={state.palettes} />
            <ImportPalettes dispatch={dispatch} palettes={state.palettes} />
        </div>
    ),
};

export function Sidebar({
    dispatch,
    state,
    canvasRef,
    hover,
    setHover,
}: {
    dispatch: (action: Action) => void;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    state: State;
    canvasRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
    const [dragging, callbacks] = useDropTarget((state) =>
        dispatch({ type: 'reset', state }),
    );

    return (
        <div
            style={{
                overflow: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                background: dragging ? 'rgba(255,255,255,0.1)' : '',
                transition: '.3s ease background',
            }}
            {...callbacks}
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
            <div
                style={{
                    height: 4,
                    backgroundColor: '#444',
                    margin: '24px 4px',
                }}
            />
            <Tabs
                current={state.tab}
                props={{ state, dispatch, canvasRef, hover, setHover }}
                tabs={tabs}
                onSelect={(tab) =>
                    dispatch({ type: 'tab:set', tab: tab as Tab })
                }
            />
        </div>
    );
}
