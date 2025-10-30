import {Button} from 'primereact/button';
import {OverlayPanel} from 'primereact/overlaypanel';
import * as React from 'react';
import {Clips} from '../editor/Clips';
import {Hover} from '../editor/Hover';
import {UndoPanel} from '../editor/UndoPanel';
import {Action, GlobalTransform} from '../state/Action';
import {Mirror, Path, PathGroup, State} from '../types';
import {Accordion as MyAccordion} from './Accordion';

import dayjs from 'dayjs';
import reactColor from 'react-color';
import {Export} from '../editor/Export';
import {PathForm, PathGroupForm, ViewForm} from '../editor/Forms';
import {ShowMirror} from '../editor/MirrorForm';
import {MultiStyleForm} from '../editor/MultiStyleForm';
import {OverlaysForm} from '../editor/OverlaysForm';
import {PalettesForm} from '../editor/PalettesForm';
import {paletteColor} from '../editor/RenderPath.lightenedColor.related';
import {Tilings} from '../editor/Tilings';
import {selectedPathIds} from '../editor/selectedPathIds';
import {getStateFromFile} from '../editor/useDropTarget';
import {
    CubeIcon,
    DrillIcon,
    IconHistoryToggle,
    IconVerticalAlignMiddle,
    MagicWandIcon,
    PencilIcon,
    RedoIcon,
    UndoIcon,
} from '../icons/Icon';
import {getMirrorTransforms} from '../rendering/getMirrorTransforms';
import {groupSort} from '../threed/groupSort';
import {Screen, UIDispatch, UIState} from '../useUIState';
import {useLocalStorage} from '../vest/useLocalStorage';
import {MirrorItems} from './MirrorItems';
import {GuideInspector} from './GuideInspector';
import {pkClipPaths} from './pkClipPaths';
import {itemStyle} from './itemStyle';

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
        {} as {[key: string]: boolean},
    );
    const mirrorTransforms = React.useMemo(
        () => getMirrorTransforms(state.mirrors),
        [state.mirrors],
    );

    const setHover = React.useCallback(
        (hover: UIState['hover']) => uiDispatch({type: 'hover', hover}),
        [],
    );

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
            <div style={{display: 'flex', flexDirection: 'row'}} className="mb-3">
                {[
                    {name: 'edit', icon: PencilIcon},
                    {name: 'animate', icon: MagicWandIcon},
                    {name: '3d', icon: CubeIcon},
                    {name: 'gcode', icon: DrillIcon},
                    {name: 'history', icon: IconHistoryToggle},
                    {name: 'overlay', icon: IconVerticalAlignMiddle},
                ].map((Config, i) => (
                    <Button
                        key={i}
                        tooltip={Config.name}
                        className={uiState.screen === Config.name ? '' : 'p-button-text'}
                        onClick={() =>
                            uiState.screen !== Config.name &&
                            uiDispatch({
                                type: 'screen',
                                screen: Config.name as Screen,
                            })
                        }
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
                                                        const dirty = lastSaved.dirty as () => void;
                                                        dirty();
                                                    }}
                                                    style={{
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Last saved {dayjs(lastSaved.when).fromNow()}
                                                </div>
                                            )
                                        ) : (
                                            'Saved'
                                        )}
                                        <a
                                            target="_blank"
                                            href={`https://gist.github.com/${lastSaved.id}`}
                                            className="pi pi-external-link pi-button pi-button-text m-1"
                                            onClick={(evt) => evt.stopPropagation()}
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
                                <Button onClick={() => closeFile()}>Close File</Button>
                                <div>
                                    Import:{' '}
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
                                <div style={{flex: 1}} />
                                {state.activeMirror ? (
                                    <div
                                        style={{
                                            marginLeft: 8,
                                            marginTop: -11,
                                            marginBottom: -10,
                                        }}
                                    >
                                        <ShowMirror
                                            mirror={state.mirrors[state.activeMirror]}
                                            transforms={mirrorTransforms[state.activeMirror]}
                                            size={40}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ),
                        content: () => (
                            <MirrorItems state={state} setHover={setHover} dispatch={dispatch} />
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
                            setHover(hovered ? {type: 'guides'} : null);
                        },
                        content: () => {
                            return (
                                <GuideItems state={state} setHover={setHover} dispatch={dispatch} />
                            );
                        },
                    },
                    {
                        key: 'guide-inspector',
                        header: <div> Guide Inspector </div>,
                        content: () => {
                            return (
                                <GuideInspector
                                    state={state}
                                    setHover={setHover}
                                    // dispatch={dispatch}
                                />
                            );
                        },
                    },
                    {
                        key: 'fill',
                        header: 'Stroke & Fill',
                        content: () => (
                            <div className="p-3">
                                {styleIds.length ? (
                                    <MultiStyleForm
                                        ppi={state.meta.ppi}
                                        dispatch={dispatch}
                                        palette={state.palette}
                                        styles={styleIds.map((k) => state.paths[k].style)}
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
                        key: 'shapes',
                        header: 'Shapes',
                        always: true,
                        content: (expanded: boolean) => (
                            <ShapeItems
                                state={state}
                                setHover={setHover}
                                dispatch={dispatch}
                                onlyShowSelected={!expanded}
                            />
                        ),
                    },
                    {
                        key: 'clips',
                        header: 'Clips',
                        content: () => (
                            <Clips state={state} dispatch={dispatch} setHover={setHover} />
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
                            <Export state={state} dispatch={dispatch} originalSize={1000} />
                        ),
                    },
                    {
                        key: 'tilings',
                        header: 'Tilings',
                        content: () => (
                            <Tilings state={state} dispatch={dispatch} uiDispatch={uiDispatch} />
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
                        content: () => <OverlaysForm state={state} dispatch={dispatch} />,
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
                                <div style={{flex: 1}} />
                                <Button
                                    className="p-button-sm p-button-rounded p-button-text"
                                    style={{
                                        marginTop: -10,
                                        marginBottom: -12,
                                    }}
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                        dispatch({type: 'undo'});
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
                                        dispatch({type: 'redo'});
                                    }}
                                >
                                    <RedoIcon />
                                </Button>
                            </div>
                        ),
                        content: () => <UndoPanel state={state} dispatch={dispatch} />,
                    },
                    {
                        key: 'transform',
                        header: 'Transform',
                        content() {
                            return (
                                <>
                                    <TransformPanel state={state} dispatch={dispatch} />
                                    <TransformGlobal state={state} dispatch={dispatch} />
                                </>
                            );
                        },
                    },
                ]}
            />
        </div>
    );
};

const showMirror = (id: string | Mirror, mirrors: {[key: string]: Mirror}): JSX.Element => {
    const mirror = typeof id === 'string' ? mirrors[id] : id;
    return (
        <span style={{fontSize: '80%', marginLeft: 16, opacity: 0.7}}>
            {(mirror.rotational.length + 1) * (mirror.reflect ? 2 : 1)}x
        </span>
    );
};

const transforms: {title: string; action: GlobalTransform}[] = [
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

function TransformGlobal({state, dispatch}: {state: State; dispatch: React.Dispatch<Action>}) {
    return (
        <div>
            <div>Global Transformations</div>
            {transforms.map(({title, action}, i) => (
                <button key={i} onClick={() => dispatch(action)}>
                    {title}
                </button>
            ))}
        </div>
    );
}

function TransformPanel({state, dispatch}: {state: State; dispatch: React.Dispatch<Action>}) {
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
                {/* <button
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
                </button> */}
                <div>
                    <select onChange={(evt) => setClip(evt.target.value)} value={clip ?? ''}>
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

                            pkClipPaths(state, state.clips[cn].shape, inset, pathIds, dispatch);
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
    onlyShowSelected,
}: {
    state: State;
    setHover: (hover: Hover | null) => void;
    dispatch: React.Dispatch<Action>;
    onlyShowSelected: boolean;
}): JSX.Element {
    const groups: {[key: string]: string[]} = {};
    Object.entries(state.paths).forEach(([id, path]) => {
        groups[path.group ?? ''] = (groups[path.group ?? ''] ?? []).concat(id);
    });
    const ungrouped = Object.entries(state.paths)
        .filter(([_, path]) => !state.pathGroups[path.group!])
        .map(([k, path]) => (
            <PathItem key={k} k={k} state={state} setHover={setHover} dispatch={dispatch} />
        ));
    return (
        <>
            {Object.entries(state.pathGroups)
                .filter((k) => groups[k[0]])
                .sort(([_, a], [__, b]) => groupSort(a, b))
                .map(([k, group]) => (
                    <PathGroupItem
                        key={k}
                        k={k}
                        state={state}
                        setHover={setHover}
                        dispatch={dispatch}
                        group={group}
                        pathKeys={groups[k] ?? []}
                        onlyShowSelected={onlyShowSelected}
                    />
                ))}
            {ungrouped.length ? (
                <div>
                    <h1></h1>
                    <div
                        className="hover py-3 px-2 hover:surface-hover"
                        style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--surface-border)',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        Ungrouped paths
                    </div>

                    {ungrouped}
                </div>
            ) : null}
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
    onlyShowSelected,
}: {
    k: string;
    state: State;
    setHover: (hover: Hover | null) => void;
    dispatch: React.Dispatch<Action>;
    group: PathGroup;
    pathKeys: string[];
    onlyShowSelected: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const isSelected = state.selection?.type === 'PathGroup' && state.selection.ids.includes(k);
    const isSubSelected =
        state.selection?.type === 'Path' &&
        state.selection.ids.some((id) => state.paths[id].group === k);
    const op = React.useRef<OverlayPanel>(null);
    if (onlyShowSelected && !isSelected && !isSubSelected) {
        return null;
    }

    return (
        <>
            <div
                className="hover"
                style={{
                    ...itemStyle(isSelected, isSubSelected),
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
                    icon={`p-accordion-toggle-icon pi pi-chevron-${open ? 'down' : 'right'}`}
                    style={{
                        marginTop: -10,
                        marginBottom: -12,
                        marginLeft: 18,
                    }}
                    onClick={(evt) => {
                        evt.stopPropagation();
                        setOpen(!open);
                    }}
                />
                Group of {pathKeys.length} shapes
                <div style={{flex: 1}} />
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
                            dispatch({type: 'group:delete', id: k});
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
                ...itemStyle(state.selection?.type === 'Path' && state.selection.ids.includes(k)),
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
            <div style={{flex: 1}} />
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
                    onChange={(path) => dispatch({type: 'path:update', id: k, path})}
                    onDelete={() => {
                        dispatch({type: 'path:delete', id: k});
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
                        state.selection?.type === 'Guide' && state.selection.ids.includes(k),
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
                                state.selection?.type === 'Guide' && state.selection.ids.includes(k)
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
                    {guide.mirror ? showMirror(guide.mirror, state.mirrors) : null}
                    <span style={{flex: 1}} />
                    <Button
                        onClick={() => {
                            dispatch({
                                type: 'guide:delete',
                                id: k,
                            });
                        }}
                        icon="pi pi-trash"
                        className=" p-button-sm p-button-text p-button-danger"
                        style={{marginTop: -5, marginBottom: -6}}
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

const NewPalettesForm = ({
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
        tmp.length !== state.palette.length || tmp.some((t, i) => t !== state.palette[i]);

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
                    <reactColor.SketchPicker
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
