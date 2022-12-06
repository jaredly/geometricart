import * as React from 'react';
import { Action } from '../state/Action';
import { Mirror, Path, PathGroup, State } from '../types';
import { Tree } from 'primereact/tree';
import { Button } from 'primereact/button';
import { Accordion as MyAccordion } from './Accordion';
import { Hover, ReallyButton } from '../editor/Sidebar';
import { UndoPanel } from '../editor/UndoPanel';
import { Clips } from '../editor/Clips';
import { OverlayPanel } from 'primereact/overlaypanel';

import type * as CSS from 'csstype';
import { selectedPathIds } from '../editor/touchscreenControls';
import { MultiStyleForm, StyleHover } from '../editor/MultiStyleForm';
import { Export } from '../editor/Export';
import { Screen } from '../App';
import {
    DrillIcon,
    IconButton,
    IconHistoryToggle,
    MagicWandIcon,
    PencilIcon,
    RedoIcon,
    UndoIcon,
} from '../icons/Icon';
import { useLocalStorage } from '../vest/App';
import { PalettesForm } from '../editor/PalettesForm';
import { OverlaysForm } from '../editor/OverlaysForm';
import { PathForm, PathGroupForm, ViewForm } from '../editor/Forms';
import { initialState } from '../state/initialState';
import { getStateFromFile } from '../editor/useDropTarget';
import { ShowMirror } from '../editor/MirrorForm';
import { getMirrorTransforms } from '../rendering/getMirrorTransforms';
import { MirrorItems } from './MirrorItems';
import dayjs from 'dayjs';

declare module 'csstype' {
    interface Properties {
        '--hover-color'?: string;
    }
}

export const NewSidebar = ({
    state,
    dispatch,
    hover,
    setHover,
    setStyleHover,
    screen,
    setScreen,
    lastSaved,
}: {
    lastSaved: {
        when: number;
        dirty: null | true | (() => void);
        id: string;
    } | null;
    state: State;
    dispatch: React.Dispatch<Action>;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
    setStyleHover: (hover: StyleHover | null) => void;
    screen: Screen;
    setScreen: (s: Screen) => void;
}): JSX.Element => {
    const styleIds = selectedPathIds(state);
    const [openSidebars, setOpenSidebars] = useLocalStorage(
        'openSidebarIds',
        {} as { [key: string]: boolean },
    );
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );
    if (!state.palette) {
        debugger;
    }
    return (
        <div
            style={{
                width: 400,
                padding: 16,
                alignSelf: 'stretch',
                background: 'var(--surface-ground)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
            }}
        >
            <div
                style={{ display: 'flex', flexDirection: 'row' }}
                className="mb-3"
            >
                {[
                    { name: 'edit', icon: PencilIcon },
                    { name: 'animate', icon: MagicWandIcon },
                    { name: 'gcode', icon: DrillIcon },
                    { name: 'history', icon: IconHistoryToggle },
                ].map((Config) => (
                    <Button
                        className={
                            screen === Config.name ? '' : 'p-button-text'
                        }
                        onClick={() => setScreen(Config.name as Screen)}
                        disabled={screen === Config.name}
                    >
                        <Config.icon />
                    </Button>
                ))}
            </div>
            {/* <Accordion>
                <AccordionTab header="Yes please">Ok folks</AccordionTab>
            </Accordion> */}
            <MyAccordion
                activeIds={openSidebars}
                setActiveIds={(ids) => {
                    setOpenSidebars(ids);
                }}
                tabs={[
                    {
                        key: 'file',
                        header: (
                            <div
                                className="flex flex-row align-items-center"
                                style={{
                                    flex: 1,
                                    justifyContent: 'space-between',
                                }}
                            >
                                File
                                {lastSaved ? (
                                    <div>
                                        {lastSaved.dirty ? (
                                            lastSaved.dirty === true ? (
                                                'Saving...'
                                            ) : (
                                                <div
                                                    onClick={(evt) => {
                                                        evt.stopPropagation();
                                                        const dirty =
                                                            lastSaved.dirty as () => void;
                                                        dirty();
                                                    }}
                                                    style={{
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Last saved{' '}
                                                    {dayjs(
                                                        lastSaved.when,
                                                    ).fromNow()}
                                                </div>
                                            )
                                        ) : (
                                            'Saved'
                                        )}
                                        <a
                                            target="_blank"
                                            href={`https://gist.github.com/${lastSaved.id}`}
                                            className="pi pi-external-link pi-button pi-button-text m-1"
                                            onClick={(evt) =>
                                                evt.stopPropagation()
                                            }
                                            style={{
                                                textDecoration: 'none',
                                                color: 'inherit',
                                            }}
                                        ></a>
                                    </div>
                                ) : null}
                            </div>
                        ),
                        content: () => (
                            <div className="p-3">
                                <Button onClick={() => (location.hash = '/')}>
                                    Close File
                                </Button>
                                <div>
                                    Import:{' '}
                                    <input
                                        type="file"
                                        placeholder="Select a file to import"
                                        onChange={(evt) => {
                                            if (
                                                evt.target.files?.length !== 1
                                            ) {
                                                return;
                                            }
                                            getStateFromFile(
                                                evt.target.files[0],
                                                (state) => {
                                                    if (state) {
                                                        dispatch({
                                                            type: 'reset',
                                                            state,
                                                        });
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
                            </div>
                        ),
                    },
                    {
                        key: 'mirrors',
                        header: (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    flex: 1,
                                }}
                            >
                                Mirrors
                                <div style={{ flex: 1 }} />
                                {state.activeMirror ? (
                                    <div
                                        style={{
                                            marginLeft: 8,
                                            marginTop: -11,
                                            marginBottom: -10,
                                        }}
                                    >
                                        <ShowMirror
                                            mirror={
                                                state.mirrors[
                                                    state.activeMirror
                                                ]
                                            }
                                            transforms={
                                                mirrorTransforms[
                                                    state.activeMirror
                                                ]
                                            }
                                            size={40}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ),
                        content: () => (
                            <MirrorItems
                                state={state}
                                setHover={setHover}
                                dispatch={dispatch}
                            />
                        ),
                    },
                    {
                        key: 'guides',
                        header: (
                            <div>
                                Guides
                                {toggleViewGuides(state, dispatch)}
                            </div>
                        ),
                        onHover(hovered) {
                            setHover(hovered ? { type: 'guides' } : null);
                        },
                        content: () => {
                            return (
                                <GuideItems
                                    state={state}
                                    setHover={setHover}
                                    dispatch={dispatch}
                                />
                            );
                        },
                    },
                    {
                        key: 'shapes',
                        header: 'Shapes',
                        content: () => (
                            <ShapeItems
                                state={state}
                                setHover={setHover}
                                dispatch={dispatch}
                            />
                        ),
                    },
                    {
                        key: 'fill',
                        header: 'Stroke & Fill',
                        content: () => (
                            <div className="p-3">
                                {styleIds.length ? (
                                    <MultiStyleForm
                                        palette={state.palette}
                                        styles={styleIds.map(
                                            (k) => state.paths[k].style,
                                        )}
                                        onHover={(hover) => {
                                            setStyleHover(hover);
                                        }}
                                        onChange={(styles) => {
                                            const changed: {
                                                [key: string]: Path;
                                            } = {};
                                            styles.forEach((style, i) => {
                                                if (style != null) {
                                                    const id = styleIds[i];
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
                                ) : (
                                    'Select some shapes to edit their style'
                                )}
                            </div>
                        ),
                    },
                    {
                        key: 'clips',
                        header: 'Clips',
                        content: () => (
                            <Clips
                                state={state}
                                dispatch={dispatch}
                                setHover={setHover}
                            />
                        ),
                    },
                    {
                        key: 'view',
                        header: 'View',
                        content: () => (
                            <ViewForm
                                view={state.view}
                                palette={state.palette}
                                onChange={(view) => {
                                    dispatch({
                                        type: 'view:update',
                                        view,
                                    });
                                }}
                            />
                        ),
                    },
                    {
                        key: 'export',
                        header: 'Export',
                        content: () => (
                            <Export
                                state={state}
                                dispatch={dispatch}
                                originalSize={1000}
                            />
                        ),
                    },
                    {
                        key: 'palette',
                        header: 'Palette',
                        content: () => (
                            <PalettesForm state={state} dispatch={dispatch} />
                        ),
                    },
                    {
                        key: 'overlays',
                        header: 'Overlays',
                        content: () => (
                            <OverlaysForm state={state} dispatch={dispatch} />
                        ),
                    },
                    {
                        key: 'history',
                        header: (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    flex: 1,
                                }}
                            >
                                History
                                <div style={{ flex: 1 }} />
                                <Button
                                    className="p-button-sm p-button-rounded p-button-text"
                                    style={{
                                        marginTop: -10,
                                        marginBottom: -12,
                                    }}
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                        dispatch({ type: 'undo' });
                                    }}
                                >
                                    <UndoIcon />
                                </Button>
                                <Button
                                    className="p-button-sm p-button-rounded p-button-text"
                                    style={{
                                        marginTop: -10,
                                        marginBottom: -12,
                                    }}
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                        dispatch({ type: 'redo' });
                                    }}
                                >
                                    <RedoIcon />
                                </Button>
                            </div>
                        ),
                        content: () => (
                            <UndoPanel state={state} dispatch={dispatch} />
                        ),
                    },
                ]}
            />
        </div>
    );
};

const showMirror = (
    id: string | Mirror,
    mirrors: { [key: string]: Mirror },
): JSX.Element => {
    const mirror = typeof id === 'string' ? mirrors[id] : id;
    return (
        <span style={{ fontSize: '80%', marginLeft: 16, opacity: 0.7 }}>
            {(mirror.rotational.length + 1) * (mirror.reflect ? 2 : 1)}x
        </span>
    );
};

function ShapeItems({
    state,
    setHover,
    dispatch,
}: {
    state: State;
    setHover: (hover: Hover | null) => void;
    dispatch: React.Dispatch<Action>;
}): JSX.Element {
    const groups: { [key: string]: string[] } = {};
    Object.entries(state.paths).forEach(([id, path]) => {
        groups[path.group ?? ''] = (groups[path.group ?? ''] ?? []).concat(id);
    });
    return (
        <>
            {Object.entries(state.pathGroups)
                .filter((k) => groups[k[0]])
                .map(([k, group]) => (
                    <PathGroupItem
                        key={k}
                        k={k}
                        state={state}
                        setHover={setHover}
                        dispatch={dispatch}
                        group={group}
                        pathKeys={groups[k] ?? []}
                    />
                ))}
        </>
    );
}

function PathGroupItem({
    k,
    state,
    setHover,
    dispatch,
    group,
    pathKeys,
}: {
    k: string;
    state: State;
    setHover: (hover: Hover | null) => void;
    dispatch: React.Dispatch<Action>;
    group: PathGroup;
    pathKeys: string[];
}): JSX.Element {
    const [open, setOpen] = React.useState(false);
    const isSelected =
        state.selection?.type === 'PathGroup' &&
        state.selection.ids.includes(k);
    const op = React.useRef<OverlayPanel>(null);

    return (
        <>
            <div
                className="hover"
                style={{
                    ...itemStyle(isSelected),
                    padding: '8px 0',
                }}
                onMouseEnter={() =>
                    setHover({
                        type: 'element',
                        kind: 'PathGroup',
                        id: k,
                    })
                }
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={(evt) => {
                    if (evt.shiftKey && state.selection?.type === 'PathGroup') {
                        dispatch({
                            type: 'selection:set',
                            selection: {
                                type: 'PathGroup',
                                ids: state.selection.ids.includes(k)
                                    ? state.selection.ids.filter((i) => i !== k)
                                    : state.selection.ids.concat([k]),
                            },
                        });
                    } else {
                        dispatch({
                            type: 'selection:set',
                            selection: isSelected
                                ? null
                                : {
                                      type: 'PathGroup',
                                      ids: [k],
                                  },
                        });
                    }
                }}
                onMouseLeave={() => setHover(null)}
            >
                <Button
                    className="p-button-sm p-button-rounded p-button-text"
                    icon={`p-accordion-toggle-icon pi pi-chevron-${
                        open ? 'down' : 'right'
                    }`}
                    style={{
                        marginTop: -10,
                        marginBottom: -12,
                    }}
                    onClick={(evt) => {
                        evt.stopPropagation();
                        setOpen(!open);
                    }}
                />
                Group of {pathKeys.length} shapes
                <div style={{ flex: 1 }} />
                <Button
                    icon="pi pi-cog"
                    className="p-button-text"
                    onClick={(e) => {
                        op.current?.toggle(e);
                        e.stopPropagation();
                    }}
                />
                <OverlayPanel ref={op}>
                    <PathGroupForm
                        group={state.pathGroups[k]}
                        selected={false}
                        onChange={(group) =>
                            dispatch({
                                type: 'group:update',
                                id: k,
                                group,
                            })
                        }
                        onDelete={() => {
                            dispatch({ type: 'group:delete', id: k });
                        }}
                        onMouseOver={() => {}}
                        onMouseOut={() => {}}
                    />
                </OverlayPanel>
            </div>
            {open ? (
                <div className="pl-5">
                    {pathKeys.map((k) => (
                        <PathItem
                            key={k}
                            k={k}
                            state={state}
                            setHover={setHover}
                            dispatch={dispatch}
                        />
                    ))}
                </div>
            ) : null}
        </>
    );
}

function PathItem({
    k,
    state,
    setHover,
    dispatch,
}: {
    k: string;
    state: State;
    setHover: (hover: Hover | null) => void;
    dispatch: React.Dispatch<Action>;
}): JSX.Element {
    const op = React.useRef<OverlayPanel>(null);
    return (
        <div
            key={k}
            className="hover"
            style={{
                ...itemStyle(
                    state.selection?.type === 'Path' &&
                        state.selection.ids.includes(k),
                ),
                // padding: '8px 0',
            }}
            onMouseEnter={() =>
                setHover({
                    type: 'element',
                    kind: 'Path',
                    id: k,
                })
            }
            onMouseDown={(evt) => evt.preventDefault()}
            onClick={(evt) => {
                evt.preventDefault();
                if (evt.shiftKey && state.selection?.type === 'Path') {
                    dispatch({
                        type: 'selection:set',
                        selection: {
                            type: 'Path',
                            ids: state.selection.ids.includes(k)
                                ? state.selection.ids.filter((i) => i !== k)
                                : state.selection.ids.concat([k]),
                        },
                    });
                } else {
                    dispatch({
                        type: 'selection:set',
                        selection: {
                            type: 'Path',
                            ids: [k],
                        },
                    });
                }
            }}
            onMouseLeave={() => setHover(null)}
        >
            {state.paths[k].segments.length} segments
            <div style={{ flex: 1 }} />
            <Button
                icon="pi pi-cog"
                className="p-button-text pl-2"
                style={{
                    marginTop: -8,
                    marginBottom: -8,
                }}
                onClick={(e) => {
                    op.current?.toggle(e);
                    e.stopPropagation();
                }}
            />
            <OverlayPanel ref={op}>
                <PathForm
                    path={state.paths[k]}
                    selected={false}
                    onChange={(path) =>
                        dispatch({ type: 'path:update', id: k, path })
                    }
                    onDelete={() => {
                        dispatch({ type: 'path:delete', id: k });
                    }}
                    onMouseOver={() => {}}
                    onMouseOut={() => {}}
                />
            </OverlayPanel>
        </div>
    );
}

function GuideItems({
    state,
    setHover,
    dispatch,
}: {
    state: State;
    setHover: (hover: Hover | null) => void;
    dispatch: React.Dispatch<Action>;
}): JSX.Element {
    return (
        <>
            {Object.entries(state.guides).map(([k, guide]) => (
                <div
                    key={k}
                    className="hover"
                    style={itemStyle(
                        state.selection?.type === 'Guide' &&
                            state.selection.ids.includes(k),
                    )}
                    onMouseEnter={() =>
                        setHover({
                            type: 'element',
                            kind: 'Guide',
                            id: k,
                        })
                    }
                    onClick={() => {
                        dispatch({
                            type: 'selection:set',
                            selection:
                                state.selection?.type === 'Guide' &&
                                state.selection.ids.includes(k)
                                    ? null
                                    : {
                                          type: 'Guide',
                                          ids: [k],
                                      },
                        });
                    }}
                    onMouseLeave={() => setHover(null)}
                >
                    {guide.geom.type}
                    {guide.mirror
                        ? showMirror(guide.mirror, state.mirrors)
                        : null}
                    <span style={{ flex: 1 }} />
                    <Button
                        onClick={() => {
                            dispatch({
                                type: 'guide:delete',
                                id: k,
                            });
                        }}
                        icon="pi pi-trash"
                        className=" p-button-sm p-button-text p-button-danger"
                        style={{ marginTop: -5, marginBottom: -6 }}
                    />
                </div>
            ))}
        </>
    );
}

function toggleViewGuides(state: State, dispatch: React.Dispatch<Action>) {
    return (
        <Button
            className="p-button-sm p-button-rounded p-button-text"
            icon={'pi pi-eye' + (state.view.guides ? '' : '-slash')}
            style={{
                marginTop: -10,
                marginBottom: -12,
            }}
            onClick={(evt) => {
                evt.stopPropagation();
                dispatch({
                    type: 'view:update',
                    view: {
                        ...state.view,
                        guides: !state.view.guides,
                    },
                });
            }}
        />
    );
}

export function itemStyle(selected: boolean): React.CSSProperties | undefined {
    return {
        padding: 8,
        cursor: 'pointer',
        marginBottom: 0,
        '--hover-color': 'var(--surface-hover)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: selected ? '#555' : '',
    };
}
