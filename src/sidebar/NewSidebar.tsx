import * as React from 'react';
import { Action } from '../state/Action';
import { Mirror, Path, PathGroup, State } from '../types';
import { Checkbox } from 'primereact/checkbox';
import { Tree } from 'primereact/tree';
import { Button } from 'primereact/button';
import { Accordion as MyAccordion } from './Accordion';
import { Hover } from '../editor/Sidebar';
import { Clips } from '../editor/Clips';

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
} from '../icons/Icon';
import { useLocalStorage } from '../vest/App';
import { PalettesForm } from '../editor/PalettesForm';
import { OverlaysForm } from '../editor/OverlaysForm';

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
}: {
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
                        key: 'mirrors',
                        header: 'Mirrors',
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
                                        palette={
                                            state.palettes[state.activePalette]
                                        }
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
                                    'Select some shapes'
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
            {Object.entries(state.pathGroups).map(([k, group]) => (
                <PathGroupItem
                    key={k}
                    k={k}
                    state={state}
                    setHover={setHover}
                    dispatch={dispatch}
                    group={group}
                    pathKeys={groups[k]}
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
            </div>
            {open ? (
                <div className="pl-5">
                    {pathKeys.map((k) => (
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
                                if (
                                    evt.shiftKey &&
                                    state.selection?.type === 'Path'
                                ) {
                                    dispatch({
                                        type: 'selection:set',
                                        selection: {
                                            type: 'Path',
                                            ids: state.selection.ids.includes(k)
                                                ? state.selection.ids.filter(
                                                      (i) => i !== k,
                                                  )
                                                : state.selection.ids.concat([
                                                      k,
                                                  ]),
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
                        </div>
                    ))}
                </div>
            ) : null}
        </>
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
                            selection: {
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

function MirrorItems({
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
            {Object.entries(state.mirrors).map(([k, mirror]) => (
                <div
                    key={k}
                    className="field-radiobutton hover"
                    style={itemStyle(false)}
                    onMouseEnter={() =>
                        setHover({
                            type: 'element',
                            kind: 'Mirror',
                            id: k,
                        })
                    }
                    onClick={() => {
                        if (state.activeMirror !== k) {
                            dispatch({
                                type: 'mirror:active',
                                id: k,
                            });
                        } else {
                            dispatch({
                                type: 'mirror:active',
                                id: null,
                            });
                        }
                    }}
                    onMouseLeave={() => setHover(null)}
                >
                    <Checkbox
                        checked={state.activeMirror === k}
                        inputId={k}
                        onClick={(evt) => evt.stopPropagation()}
                        onChange={(evt) => {
                            if (state.activeMirror !== evt.value) {
                                dispatch({
                                    type: 'mirror:active',
                                    id: evt.value,
                                });
                            } else {
                                dispatch({
                                    type: 'mirror:active',
                                    id: null,
                                });
                            }
                        }}
                        name="mirror"
                        value={k}
                    />
                    <label
                        htmlFor={k}
                        onClick={(evt) => evt.stopPropagation()}
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '80%',
                            cursor: 'pointer',
                            flex: 1,
                        }}
                    >
                        {mirror.rotational.length}x at{' '}
                        {mirror.origin.x.toFixed(2)},
                        {mirror.origin.y.toFixed(2)}
                    </label>
                </div>
            ))}
        </>
    );
}

export function itemStyle(selected: boolean): React.CSSProperties | undefined {
    return {
        padding: 8,
        cursor: 'pointer',
        marginBottom: 0,
        '--hover-color': 'rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: selected ? '#555' : '',
    };
}
