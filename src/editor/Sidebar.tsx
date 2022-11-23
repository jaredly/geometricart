/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { GuideForm, PathForm, PathGroupForm, ViewForm } from './Forms';
import { MirrorForm } from './MirrorForm';
import {
    guideTypes,
    State,
    Tab,
    Id,
    Path,
    PathGroup,
    Selection,
} from '../types';
import { Action, PathMultiply, UndoAction } from '../state/Action';
import { initialState } from '../state/initialState';
import { Export } from './Export';
import { PendingMirror } from '../App';
import {
    getStateFromFile,
    useDropStateOrAttachmentTarget,
} from './useDropTarget';
import { PalettesForm } from './PalettesForm';
import { MultiStyleForm, mergeStyles } from './MultiStyleForm';
import { OverlaysForm } from './OverlaysForm';
import { diff } from 'json-diff-ts';
import { Clips } from './Clips';

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

export type Hover =
    | {
          type: 'element';
          kind: Selection['type'] | 'Clip';
          id: Id;
      }
    | { type: 'guides' };

export type TabProps = {
    state: State;
    dispatch: (action: Action) => unknown;
    canvasRef: { current: SVGSVGElement | null };
    hover: Hover | null;
    width: number;
    height: number;
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
                        onMouseOver={() =>
                            setHover({ kind: 'Guide', id: k, type: 'element' })
                        }
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
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                }}
            >
                {state.selection?.type === 'PathGroup'
                    ? (() => {
                          const ids = Object.keys(state.paths).filter((k) =>
                              state.selection!.ids.includes(
                                  state.paths[k].group!,
                              ),
                          );
                          return (
                              <MultiStyleForm
                                  palette={state.palettes[state.activePalette]}
                                  styles={ids.map((k) => state.paths[k].style)}
                                  onHover={() => {}}
                                  onChange={(styles) => {
                                      const changed: { [key: string]: Path } =
                                          {};
                                      styles.forEach((style, i) => {
                                          if (style != null) {
                                              const id = ids[i];
                                              changed[id] = {
                                                  ...state.paths[id],
                                                  style,
                                              };
                                          }
                                      });
                                      dispatch({
                                          type: 'path:update:many',
                                          changed,
                                      });
                                  }}
                              />
                          );
                      })()
                    : null}
                <div
                    css={{
                        overflow: 'auto',
                        flex: 1,
                        minHeight: 100,
                    }}
                >
                    {Object.keys(state.pathGroups)
                        .filter(
                            (k) =>
                                (state.selection?.type === 'PathGroup' &&
                                    state.selection.ids.includes(k)) ||
                                state.pathGroups[k].hide,
                        )
                        .map((k) => (
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
                                    setHover({
                                        kind: 'PathGroup',
                                        id: k,
                                        type: 'element',
                                    });
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
            </div>
        );
    },
    Paths: ({ state, dispatch, setHover }) => (
        <div
            css={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
            }}
        >
            {state.selection?.type === 'Path' ? (
                <MultiStyleForm
                    palette={state.palettes[state.activePalette]}
                    styles={state.selection.ids.map(
                        (id) => state.paths[id].style,
                    )}
                    onHover={() => {}}
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
            <div
                css={{
                    overflow: 'auto',
                    flex: 1,
                    minHeight: 100,
                }}
            >
                {Object.keys(state.paths)
                    .filter(
                        (k) =>
                            state.paths[k].debug ||
                            (state.selection?.type === 'Path' &&
                                state.selection.ids.includes(k)) ||
                            state.paths[k].hidden ||
                            (state.selection?.type === 'PathGroup' &&
                                state.selection.ids.includes(
                                    state.paths[k].group!,
                                )),
                    )
                    .map((k) => (
                        <PathForm
                            key={k}
                            onDelete={() =>
                                dispatch({ type: 'path:delete', id: k })
                            }
                            selected={
                                state.selection?.type === 'Path' &&
                                state.selection.ids.includes(k)
                            }
                            palette={state.palettes[state.activePalette]}
                            path={state.paths[k]}
                            onMouseOver={() => {
                                setHover({
                                    kind: 'Path',
                                    id: k,
                                    type: 'element',
                                });
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
        </div>
    ),
    Palette: ({ state, dispatch }) => (
        <PalettesForm state={state} dispatch={dispatch} />
    ),
    Overlays: OverlaysForm,
    Undo: ({ state, dispatch }) => {
        const [branch, setBranch] = React.useState(state.history.currentBranch);
        const current = state.history.branches[+branch];
        return (
            <div
                css={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <select
                    css={{ display: 'block' }}
                    value={branch}
                    onChange={(evt) => setBranch(+evt.target.value)}
                >
                    {Object.keys(state.history.branches).map((k) => (
                        <option value={k} key={k}>
                            Branch {k}
                        </option>
                    ))}
                </select>
                <div>{current.items.length} items</div>
                {current.parent ? (
                    <div
                        onClick={() => setBranch(current.parent!.branch)}
                        css={{
                            padding: '4px 8px',
                            border: '1px solid #aaa',
                            cursor: 'pointer',
                            ':hover': {
                                backgroundColor: 'rgba(255,255,255,0.5)',
                            },
                        }}
                    >
                        Parent branch: {current.parent.branch} @{' '}
                        {current.parent.idx}
                    </div>
                ) : (
                    'No parent'
                )}
                <div
                    css={{
                        overflow: 'auto',
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    {current.items.map((item, i) => (
                        <div
                            key={`${i}`}
                            css={{
                                padding: 8,
                            }}
                        >
                            <UndoItem item={item} />
                        </div>
                    ))}
                </div>
            </div>
        );
    },
};

export const UndoItem = ({ item }: { item: UndoAction }) => {
    switch (item.type) {
        case 'view:update':
            return (
                <span>
                    View: {JSON.stringify(diff(item.action.view, item.prev))}
                </span>
            );
        case 'overlay:update':
            return (
                <span>
                    Overlay:{' '}
                    {JSON.stringify(diff(item.action.overlay, item.prev))}
                </span>
            );
        case 'path:update:many':
            return (
                <span>
                    Update {Object.keys(item.action.changed).length} paths
                </span>
            );
    }
    return <span>{item.type}</span>;
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
    width,
    height,
    setHover,
    setPendingMirror,
}: // setDragSelect,
// dragSelect,
{
    dispatch: (action: Action) => void;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    width: number;
    height: number;
    state: State;
    canvasRef: React.MutableRefObject<SVGSVGElement | null>;
    setPendingMirror: (mirror: PendingMirror | null) => void;
    // setDragSelect: (fn: (select: boolean) => boolean) => void;
    // dragSelect: boolean;
}) {
    // const [dragging, callbacks] = useDropStateTarget(
    //     (state) => dispatch({ type: 'reset', state }),
    //     () => {},
    // );

    return (
        <div
            style={{
                overflow: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                // background: dragging ? 'rgba(255,255,255,0.1)' : '',
                transition: '.3s ease background',
            }}
            // {...callbacks}
        >
            <div>
                <div
                    css={{
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <ReallyButton
                        label="Clear all"
                        css={{ margin: 8 }}
                        onClick={() => {
                            dispatch({ type: 'reset', state: initialState });
                        }}
                    />
                    Import project:{' '}
                    <input
                        type="file"
                        placeholder="Select a file to import"
                        onChange={(evt) => {
                            if (evt.target.files?.length !== 1) {
                                return;
                            }
                            getStateFromFile(
                                evt.target.files[0],
                                (state) => {
                                    if (state) {
                                        dispatch({ type: 'reset', state });
                                    } else {
                                        alert(
                                            "Unable to parse state from image. Maybe this wasn't saved with project metadata?",
                                        );
                                    }
                                },
                                null,
                                (err) => {
                                    console.log(err);
                                    alert(err);
                                },
                            );
                        }}
                    />
                </div>
                <ViewForm
                    view={state.view}
                    palette={state.palettes[state.activePalette]}
                    onChange={(view) => {
                        dispatch({
                            type: 'view:update',
                            view,
                        });
                    }}
                />
            </div>
            {/* <div>
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
            </div> */}
            <div
                style={{
                    height: 4,
                    backgroundColor: '#444',
                    margin: '24px 4px',
                }}
            />
            <Tabs
                current={tabs[state.tab] ? state.tab : Object.keys(tabs)[0]}
                props={{
                    state,
                    width,
                    height,
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
