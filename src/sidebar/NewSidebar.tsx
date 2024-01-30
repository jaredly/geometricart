import * as React from 'react';
import { Action, GlobalTransform } from '../state/Action';
import { Coord, Mirror, Path, PathGroup, Segment, State } from '../types';
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
import { Tilings } from '../editor/Tilings';
import { Screen, UIDispatch, UIState } from '../useUIState';
import {
    DrillIcon,
    IconButton,
    IconHistoryToggle,
    IconVerticalAlignMiddle,
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
import {
    getMirrorTransforms,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { MirrorItems } from './MirrorItems';
import dayjs from 'dayjs';
import { SketchPicker } from 'react-color';
import { paletteColor } from '../editor/RenderPath';
import { calcSegmentsD } from '../editor/calcPathD';
import {
    boundsMidpoint,
    segmentBounds,
    segmentsBounds,
    segmentsCenter,
} from '../editor/Bounds';
import { transformPath } from '../rendering/points';
import { scalePos } from '../editor/scalePos';
import { insetSegments } from '../rendering/insetPath';
import { cleanUpInsetSegments2 } from '../rendering/findInternalRegions';
import { ensureClockwise } from '../rendering/pathToPoints';
import PathKitInit, { PathKit, Path as PKPath } from 'pathkit-wasm';
import { cmdsToSegments } from '../gcode/cmdsToSegments';
import { coordsEqual } from '../rendering/pathsAreIdentical';

declare module 'csstype' {
    interface Properties {
        '--hover-color'?: string;
    }
}

export const NewSidebar = ({
    state,
    dispatch,
    lastSaved,

    uiState,
    uiDispatch,
    closeFile,
}: {
    closeFile: () => unknown;
    lastSaved: {
        when: number;
        dirty: null | true | (() => void);
        id: string;
    } | null;
    state: State;
    dispatch: React.Dispatch<Action>;

    uiDispatch: UIDispatch;
    uiState: UIState;
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

    const setHover = React.useCallback(
        (hover: UIState['hover']) => uiDispatch({ type: 'hover', hover }),
        [],
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
                    { name: 'overlay', icon: IconVerticalAlignMiddle },
                ].map((Config, i) => (
                    <Button
                        key={i}
                        className={
                            uiState.screen === Config.name
                                ? ''
                                : 'p-button-text'
                        }
                        onClick={() =>
                            uiDispatch({
                                type: 'screen',
                                screen: Config.name as Screen,
                            })
                        }
                        disabled={uiState.screen === Config.name}
                    >
                        <Config.icon />
                    </Button>
                ))}
            </div>
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
                                <Button onClick={() => closeFile()}>
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
                                        dispatch={dispatch}
                                        palette={state.palette}
                                        styles={styleIds.map(
                                            (k) => state.paths[k].style,
                                        )}
                                        onHover={(hover) => {
                                            uiDispatch({
                                                type: 'styleHover',
                                                styleHover: hover,
                                            });
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
                        key: 'tilings',
                        header: 'Tilings',
                        content: () => (
                            <Tilings
                                state={state}
                                dispatch={dispatch}
                                uiDispatch={uiDispatch}
                            />
                        ),
                    },
                    {
                        key: 'palette',
                        header: 'Palette',
                        content: () => (
                            <NewPalettesForm
                                uiDispatch={uiDispatch}
                                state={state}
                                dispatch={dispatch}
                            />
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
                    {
                        key: 'transform',
                        header: 'Transform',
                        content() {
                            return (
                                <>
                                    <TransformPanel
                                        state={state}
                                        dispatch={dispatch}
                                    />
                                    <TransformGlobal
                                        state={state}
                                        dispatch={dispatch}
                                    />
                                </>
                            );
                        },
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

const transforms: { title: string; action: GlobalTransform }[] = [
    {
        title: '+45º',
        action: {
            type: 'global:transform',
            rotate: Math.PI / 4,
            flip: null,
        },
    },
    {
        title: '-45º',
        action: {
            type: 'global:transform',
            rotate: -Math.PI / 4,
            flip: null,
        },
    },
    {
        title: '+30º',
        action: {
            type: 'global:transform',
            rotate: Math.PI / 6,
            flip: null,
        },
    },
    {
        title: '-X',
        action: {
            type: 'global:transform',
            rotate: null,
            flip: 'H',
        },
    },
    {
        title: '-Y',
        action: {
            type: 'global:transform',
            rotate: null,
            flip: 'V',
        },
    },
];

function TransformGlobal({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) {
    return (
        <div>
            <div>Global Transformations</div>
            {transforms.map(({ title, action }, i) => (
                <button key={i} onClick={() => dispatch(action)}>
                    {title}
                </button>
            ))}
        </div>
    );
}

function TransformPanel({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) {
    const [inset, setInset] = React.useState(18);
    const [clip, setClip] = React.useState(null as null | string);
    // console.log('tx', clip);
    const pathIds = selectedPathIds(state);
    if (!pathIds.length) {
        return <div>Select a thing</div>;
    }
    return (
        <div>
            <div>
                Inset:{' '}
                <input
                    value={inset}
                    onChange={(evt) => setInset(+evt.target.value)}
                    type="number"
                />
            </div>
            <div>
                <button
                    onClick={() => {
                        const bounds = segmentsBounds(
                            pathIds.flatMap((id) => state.paths[id].segments),
                        );
                        const smaller = pathIds
                            .flatMap((id) => {
                                const [segments, corners] = insetSegments(
                                    state.paths[id].segments,
                                    inset / 100,
                                );
                                const regions = cleanUpInsetSegments2(
                                    segments,
                                    corners,
                                );
                                return regions;
                            })
                            .flat();
                        const newBounds = segmentsBounds(smaller);

                        const center = boundsMidpoint(bounds);
                        const w = bounds.x1 - bounds.x0;
                        const newW = newBounds.x1 - newBounds.x0;
                        const scale = newW / w;
                        const paths: State['paths'] = {};
                        state.selection?.ids.forEach((id) => {
                            paths[id] = transformPath(state.paths[id], [
                                translationMatrix(scalePos(center, -1)),
                                scaleMatrix(scale, scale),
                                translationMatrix(center),
                            ]);
                        });
                        dispatch({ type: 'path:update:many', changed: paths });
                    }}
                >
                    Scale
                </button>
                <div>
                    <select
                        onChange={(evt) => setClip(evt.target.value)}
                        value={clip ?? ''}
                    >
                        <option>Select a clip</option>
                        {Object.keys(state.clips).map((k, i) => (
                            <option key={k} value={k}>
                                Clip {k}:{i}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            const cn = clip;
                            if (cn == null) {
                                return;
                            }

                            pkClipPaths(
                                state,
                                state.clips[cn].shape,
                                inset,
                                pathIds,
                                dispatch,
                            );
                        }}
                    >
                        Clippp
                    </button>
                    <button
                        onClick={() => {
                            const cn = clip;
                            if (cn == null) {
                                return;
                            }
                            pkClipPaths(
                                state,
                                state.clips[cn].shape,
                                inset,
                                pathIds,
                                dispatch,
                                true,
                            );
                        }}
                    >
                        Clip Reverse
                    </button>
                </div>
            </div>
        </div>
    );
}

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
                <OverlayPanel
                    ref={op}
                    onClick={(evt) => evt.stopPropagation()}
                    onMouseDown={(evt) => evt.stopPropagation()}
                >
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

export const NewPalettesForm = ({
    state,
    dispatch,
    uiDispatch,
}: {
    uiDispatch: UIDispatch;
    state: State;
    dispatch: React.Dispatch<Action>;
}) => {
    const [detail, setDetail] = React.useState(false);
    const op = React.useRef<OverlayPanel>(null);
    const [tmp, setTmp] = React.useState(state.palette);
    const [editing, setEditing] = React.useState(0);

    const modified =
        tmp.length !== state.palette.length ||
        tmp.some((t, i) => t !== state.palette[i]);

    return (
        <div className="m-3">
            <div className="flex flex-row my-2">
                {tmp.map((_, i) => (
                    <div
                        key={i}
                        onClick={(evt) => {
                            op.current!.toggle(evt);
                            setEditing(i);
                        }}
                        style={{
                            backgroundColor: paletteColor(tmp, i),
                            width: 20,
                            height: 20,
                            marginRight: 8,
                        }}
                    />
                ))}
                {modified ? (
                    <>
                        <Button
                            icon="pi pi-check"
                            className="p-button-sm p-button-text"
                            onClick={() => {
                                dispatch({
                                    type: 'palette:update',
                                    colors: tmp,
                                });
                                uiDispatch({
                                    type: 'previewActions',
                                    previewActions: [],
                                });
                            }}
                        />
                        <Button
                            icon="pi pi-times"
                            className="p-button-sm p-button-text"
                            onClick={() => {
                                setTmp(state.palette);
                                uiDispatch({
                                    type: 'previewActions',
                                    previewActions: [],
                                });
                            }}
                        />
                    </>
                ) : null}
            </div>
            <Button
                onClick={() => setDetail(!detail)}
                className="p-button-sm mt-2"
                icon="pi pi-book"
            ></Button>
            {detail ? <PalettesForm state={state} dispatch={dispatch} /> : null}
            <OverlayPanel ref={op}>
                {editing != null ? (
                    <SketchPicker
                        color={tmp[editing]}
                        onChange={(change) => {
                            setTmp((t) => {
                                t = t.slice();
                                t[editing] = change.hex;
                                uiDispatch({
                                    type: 'previewActions',
                                    previewActions: [
                                        {
                                            type: 'palette:update',
                                            colors: t.slice(),
                                        },
                                    ],
                                });
                                return t;
                            });
                        }}
                    />
                ) : null}
            </OverlayPanel>
        </div>
    );
};

export const pkPath = (
    PK: PathKit,
    segments: Segment[],
    origin?: Coord,
    open?: boolean,
) => {
    const d = calcSegmentsD(
        segments,
        origin ?? segments[segments.length - 1].to,
        open,
        1,
    );
    return PK.FromSVGString(d);
};

export const pkInset = (PK: PathKit, path: PKPath, inset: number) => {
    const line = path.copy();
    line.stroke({
        width: inset < 0 ? -inset : inset,
        join: PK.StrokeJoin.MITER,
        cap: PK.StrokeCap.SQUARE,
    });
    path.op(line, inset < 0 ? PK.PathOp.UNION : PK.PathOp.DIFFERENCE);
    line.delete();
    return path;
};

export const pkClipPath = (
    PK: PathKit,
    pkp: PKPath,
    pkClip: PKPath,
    outside = false,
): { segments: Segment[]; origin: Coord }[] => {
    pkp.op(pkClip, outside ? PK.PathOp.DIFFERENCE : PK.PathOp.INTERSECT);

    return pkPathToSegments(PK, pkp);
};

export const pkPathToSegments = (PK: PathKit, pkp: PKPath) => {
    const clipped = cmdsToSegments(pkp.toCmds(), PK);

    clipped.forEach((region) => {
        const { segments, origin, open } = region;
        if (!open) {
            if (!coordsEqual(segments[segments.length - 1].to, origin)) {
                console.error('NO BADS clipped idk', segments, origin);
                console.log(pkp.toCmds());
            }
            const segs = ensureClockwise(segments);
            region.segments = segs;
            region.origin = segs[segs.length - 1].to;
        }
    });

    return clipped;
};

export const pkClipPaths = async (
    state: State,
    clip: Segment[],
    inset: number,
    pathIds: string[],
    dispatch: React.Dispatch<Action>,
    outside = false,
) => {
    const PK = await PathKitInit({
        locateFile: (file) => '/node_modules/pathkit-wasm/bin/' + file,
    });

    const pkClip = pkPath(PK, clip);
    if (inset != 0) {
        pkInset(PK, pkClip, inset / 100);
    }

    const paths: { [key: string]: Path | null } = {};
    let nextId = state.nextId;

    pathIds.forEach((id) => {
        const path = state.paths[id];
        const pkp = pkPath(PK, path.segments, path.origin, path.open);

        const clipped = pkClipPath(PK, pkp, pkClip, outside);

        console.log(`Path ${id} clip`);
        console.log('Started as', path.segments);
        console.log('Became', clipped);

        paths[id] = { ...path, ...clipped[0] };
        for (let i = 1; i < clipped.length; i++) {
            const pt = clipped[i];
            paths[nextId] = { ...path, ...pt };
            nextId += 1;
        }
    });

    dispatch({
        type: 'selection:set',
        selection: null,
    });
    dispatch({
        type: 'path:update:many',
        changed: paths,
        nextId,
    });
};

// const clipPaths = (
//     state: State,
//     inset: number,
//     pathIds: string[],
//     dispatch: React.Dispatch<Action>,
//     outside = false,
// ) => {
//     const paths: { [key: string]: Path | null } = {};
//     if (state.view.activeClip == null) {
//         return;
//     }
//     const clip = state.clips[state.view.activeClip];

//     let insetClip: typeof clip;
//     if (inset === 0) {
//         insetClip = clip;
//     } else {
//         let [segments, corners] = insetSegments(clip, inset / 100);
//         const regions = cleanUpInsetSegments2(segments, corners);
//         insetClip = regions[0];
//         if (regions.length !== 1) {
//             console.error('nope bad clip inset');
//             return;
//         }
//     }

//     const clipBounds = segmentsBounds(insetClip);

//     let nextId = state.nextId;

//     pathIds.forEach((id) => {
//         const path = state.paths[id];
//         const clipped = clipPathTry(
//             {
//                 ...path,
//                 segments: ensureClockwise(path.segments),
//             },
//             insetClip,
//             clipBounds!,
//             false,
//             outside ? 'outside' : undefined,
//         );
//         if (!clipped.length) {
//             paths[id] = null;
//             return;
//         }
//         paths[id] = clipped[0];
//         for (let i = 1; i < clipped.length; i++) {
//             const pt = clipped[i];
//             paths[nextId] = pt;
//             nextId += 1;
//         }
//     });

//     dispatch({
//         type: 'selection:set',
//         selection: null,
//     });
//     dispatch({
//         type: 'path:update:many',
//         changed: paths,
//         nextId,
//     });
// };
