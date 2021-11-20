/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import {
    GuideForm,
    MirrorForm,
    PathForm,
    PathGroupForm,
    ViewForm,
} from './Forms';
import { guideTypes, State, Action, Tab, Id, Path, PathGroup } from './types';
import { initialState } from './initialState';
import { Export } from './Export';
import { PendingMirror, toTypeRev } from './App';
import { useDropStateTarget } from './useDropTarget';
import { PalettesForm } from './PalettesForm';
import { MultiStyleForm, mergeStyles } from './MultiStyleForm';
import { OverlaysForm } from './OverlaysForm';

export const PREFIX = `<!-- STATE:`;
export const SUFFIX = '-->';

export const Tabs = ({
    current,
    tabs,
    onSelect,
    props,
}: {
    props: TabProps;
    onSelect: (name: string) => void;
    current: string;
    tabs: { [key: string]: (props: TabProps) => React.ReactElement };
}) => {
    const Comp = tabs[current];
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
            <Comp {...props} />
        </div>
    );
};

export type Hover = {
    kind: Selection['type'] | 'Clip';
    id: Id;
};

export type TabProps = {
    state: State;
    dispatch: (action: Action) => unknown;
    canvasRef: { current: SVGSVGElement | null };
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    setPendingMirror: (mirror: PendingMirror | null) => void;
};
const tabs: { [key in Tab]: (props: TabProps) => React.ReactElement } = {
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
                        onDelete={() => {
                            dispatch({ type: 'guide:delete', id: k });
                        }}
                        selected={
                            state.selection?.type === 'Guide' &&
                            state.selection.ids.includes(k)
                        }
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
                {state.selection?.type === 'PathGroup' ? (
                    <MultiStyleForm
                        palette={state.palettes[state.activePalette]}
                        styles={state.selection.ids.map(
                            (id) => state.pathGroups[id].style,
                        )}
                        onChange={(styles) => {
                            const changed: { [key: string]: PathGroup } = {};
                            styles.forEach((style, i) => {
                                if (style != null) {
                                    const id = state.selection!.ids[i];
                                    changed[id] = {
                                        ...state.pathGroups[id],
                                        style,
                                    };
                                }
                            });
                            dispatch({
                                type: 'pathGroup:update:many',
                                changed,
                            });
                        }}
                    />
                ) : null}
                {Object.keys(state.pathGroups).map((k) => (
                    <PathGroupForm
                        onDelete={() => {
                            dispatch({ type: 'group:delete', id: k });
                        }}
                        palette={state.palettes[state.activePalette]}
                        selected={
                            state.selection?.type === 'PathGroup' &&
                            state.selection.ids.includes(k)
                        }
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
    Paths: ({ state, dispatch, setHover }) => (
        <div
            css={{
                overflow: 'auto',
                flex: 1,
                minHeight: 100,
            }}
        >
            {state.selection?.type === 'Path' ? (
                <MultiStyleForm
                    palette={state.palettes[state.activePalette]}
                    styles={state.selection.ids.map((id) =>
                        state.paths[id].group
                            ? mergeStyles(
                                  state.pathGroups[state.paths[id].group!]
                                      .style,
                                  state.paths[id].style,
                              )
                            : state.paths[id].style,
                    )}
                    onChange={(styles) => {
                        const changed: { [key: string]: Path } = {};
                        styles.forEach((style, i) => {
                            if (style != null) {
                                const id = state.selection!.ids[i];
                                changed[id] = { ...state.paths[id], style };
                            }
                        });
                        dispatch({ type: 'path:update:many', changed });
                    }}
                />
            ) : null}
            {Object.keys(state.paths).map((k) => (
                <PathForm
                    key={k}
                    onDelete={() => dispatch({ type: 'path:delete', id: k })}
                    selected={
                        state.selection?.type === 'Path' &&
                        state.selection.ids.includes(k)
                    }
                    palette={state.palettes[state.activePalette]}
                    path={state.paths[k]}
                    onMouseOver={() => {
                        setHover({ kind: 'Path', id: k });
                    }}
                    onMouseOut={() => setHover(null)}
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
    Mirrors: ({ state, dispatch, setHover, setPendingMirror }) => {
        return (
            <div
                css={{
                    overflow: 'auto',
                    flexShrink: 1,
                    flex: 1,
                    minHeight: 100,
                }}
                onClick={() => {
                    dispatch({ type: 'selection:set', selection: null });
                }}
            >
                {Object.keys(state.mirrors).map((k) => (
                    <MirrorForm
                        key={k}
                        selected={
                            state.selection?.type === 'Mirror' &&
                            state.selection.ids.includes(k)
                        }
                        setSelected={(sel) => {
                            if (sel) {
                                dispatch({
                                    type: 'selection:set',
                                    selection: { type: 'Mirror', ids: [k] },
                                });
                            } else {
                                dispatch({
                                    type: 'selection:set',
                                    selection: null,
                                });
                            }
                        }}
                        onMouseOut={() => setHover(null)}
                        onMouseOver={() => setHover({ kind: 'Mirror', id: k })}
                        isActive={state.activeMirror === k}
                        onDuplicate={() => {
                            dispatch({
                                type: 'mirror:add',
                                mirror: state.mirrors[k],
                            });
                        }}
                        onChild={() => {
                            setPendingMirror({
                                parent: k,
                                rotations: 3,
                                reflect: true,
                                center: null,
                            });
                        }}
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
                        setPendingMirror({
                            parent: null,
                            rotations: 3,
                            reflect: true,
                            center: null,
                        });
                    }}
                >
                    Create new mirror
                </button>
            </div>
        );
    },
    Export: ({ state, canvasRef, dispatch }) => (
        <Export state={state} canvasRef={canvasRef} dispatch={dispatch} />
    ),
    Palette: ({ state, dispatch }) => (
        <PalettesForm state={state} dispatch={dispatch} />
    ),
    Overlays: OverlaysForm,
    Help: () => (
        <div>
            <div>
                <h3>Recent Changes</h3>
                <ul>
                    <li>"z" and "shift+z" are now the zoom keys</li>
                    <li>
                        clicking a guide now selects it; shift+click to
                        enable/disable
                    </li>
                </ul>
            </div>
            <p>
                A sure sign this is a very usable piece of software is that I
                feel the need to prominantly display this help section.
            </p>
            <p>Basic strategy:</p>
            <ol>
                <li>
                    Make some guides (lines, circles). Click a guide button,
                    then click some points to define the guide.
                </li>
                <li>
                    Make some paths! With no guide active, click a starting
                    point for your path. Then mouse over green / red path
                    segments to define your path. Make it around to the starting
                    point to complete the path.
                </li>
                <li>Color the paths! Click a path group, click a color</li>
                <li>
                    Export! Both the SVG export and the PNG export can be later
                    re-imported (drag &amp; drop onto the sidebar) for further
                    editing.
                </li>
            </ol>
            <p>Misc:</p>
            <ul>
                <li>
                    Shift+Click on a guide to toggle it. When disabled, it will
                    not produce intersections. This can make defining paths
                    easier (fewer segments to mess with).
                </li>
                <li>
                    I recorded a quick &amp; dirty video walkthrough,{' '}
                    <a href="https://youtu.be/OfHB5STp0pM">enjoy.</a>
                </li>
            </ul>
            <p>Keyboard shortcuts:</p>
            <table>
                <tbody>
                    {Object.entries({
                        g: 'Toggle guides on/off',
                        l: 'New [L]ine guide',
                        c: 'New [C]ircle guide',
                        p: 'New [P]erpendicular bisector guide',
                        i: 'New [I]ncircle guide',
                        m: 'New Circu[m]circle guide',
                        a: 'New [A]ngle bisector guide',
                        Escape: 'Cancel whatever is happening',
                        z: 'Zoom (shift to zoom more) (handy for drawing paths with tight edges)',
                        'cmd+z': 'Undo (infinite)',
                        'cmd+shift+z': 'Redo',
                    }).map(([k, v]) => (
                        <tr key={k}>
                            <td>{k}</td>
                            <td>{v}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ),
};

export const ReallyButton = ({
    label,
    onClick,
    className,
}: {
    label: string;
    onClick: () => void;
    className?: string;
}) => {
    const [really, setReally] = React.useState(false);
    if (really) {
        return (
            <>
                <button className={className} onClick={() => setReally(false)}>
                    Nope
                </button>
                <button
                    className={className}
                    onClick={() => {
                        onClick();
                        setReally(false);
                    }}
                >
                    Really {label}
                </button>
            </>
        );
    }
    return (
        <button className={className} onClick={() => setReally(true)}>
            {label}
        </button>
    );
};

export function Sidebar({
    dispatch,
    state,
    canvasRef,
    hover,
    setHover,
    setPendingMirror,
    setDragSelect,
    dragSelect,
}: {
    dispatch: (action: Action) => void;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    state: State;
    canvasRef: React.MutableRefObject<SVGSVGElement | null>;
    setPendingMirror: (mirror: PendingMirror | null) => void;
    setDragSelect: (fn: (select: boolean) => boolean) => void;
    dragSelect: boolean;
}) {
    const [dragging, callbacks] = useDropStateTarget((state) =>
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
                <ReallyButton
                    label="Clear all"
                    css={{ margin: 8 }}
                    onClick={() => {
                        dispatch({ type: 'reset', state: initialState });
                    }}
                />
                <button
                    css={{ margin: 8 }}
                    onClick={() => {
                        dispatch({ type: 'undo' });
                    }}
                >
                    Undo
                </button>
                <button
                    css={{ margin: 8 }}
                    onClick={() => {
                        dispatch({ type: 'redo' });
                    }}
                >
                    Redo
                </button>
                <ViewForm
                    view={state.view}
                    palette={state.palettes[state.activePalette]}
                    onHoverClip={(hover) =>
                        setHover(hover ? { kind: 'Clip', id: '' } : null)
                    }
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
                        css={{
                            margin: 8,
                            padding: 8,
                            fontSize: '120%',
                        }}
                    >
                        {kind}
                        {toTypeRev[kind] ? ` (${toTypeRev[kind]})` : ''}
                    </button>
                ))}
                {state.pending ? (
                    <button
                        onClick={() =>
                            dispatch({ type: 'pending:type', kind: null })
                        }
                        css={{
                            margin: 8,
                            padding: 8,
                            fontSize: '120%',
                        }}
                    >
                        Cancel pending
                    </button>
                ) : null}
                <button
                    onClick={() => setDragSelect((current) => !current)}
                    css={{
                        margin: 8,
                        padding: 8,
                        fontSize: '120%',
                    }}
                >
                    {dragSelect ? 'Cancel drag select' : '(D)rag select'}
                </button>
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
                props={{
                    state,
                    dispatch,
                    canvasRef,
                    hover,
                    setHover,
                    setPendingMirror,
                }}
                tabs={tabs}
                onSelect={(tab) =>
                    dispatch({ type: 'tab:set', tab: tab as Tab })
                }
            />
        </div>
    );
}
