/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action } from '../state/Action';
import { push } from '../rendering/getMirrorTransforms';
import { State, GuideGeom } from '../types';
import { Button } from 'primereact/button';
import { toTypeRev } from '../handleKeyboard';
import { EditorState, ToolIcon } from './Canvas';
import { findAdjacentPaths } from '../animation/getBuiltins';

export function ToolIcons({
    state,
    editorState,
    dispatch,
    setEditorState,
    startPath,
}: {
    state: State;
    editorState: EditorState;
    dispatch: (action: Action) => unknown;
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
    startPath: () => void;
}) {
    return (
        <div
            css={{
                position: 'absolute',
                left: 0,
                top: 0,
            }}
            className="p-2 flex flex-column"
        >
            <div style={{ position: 'relative' }}>
                <Button
                    className={
                        'pi p-button-icon-only ' +
                        (state.pending == null &&
                        editorState.selectMode === true
                            ? 'p-button-outlined'
                            : '')
                    }
                    tooltip="Select"
                    onClick={() => {
                        if (state.pending != null) {
                            dispatch({ type: 'pending:type', kind: null });
                            setEditorState((es) => ({
                                ...es,
                                selectMode: true,
                            }));
                        } else {
                            setEditorState((es) => ({
                                ...es,
                                selectMode:
                                    es.selectMode === true
                                        ? !es.selectMode
                                        : true,
                            }));
                        }
                    }}
                >
                    <ToolIcon
                        lines={[
                            [
                                { x: 2, y: 0 },
                                push({ x: 2, y: 0 }, Math.PI / 4, 10),
                                push({ x: 2, y: 0 }, Math.PI / 2, 10),
                                { x: 2, y: 0 },
                            ],
                        ]}
                    />
                </Button>

                <div
                    style={{
                        position: 'absolute',
                        left: '100%',
                        top: 0,
                        paddingLeft: 8,
                        display: 'flex',
                    }}
                >
                    <Button
                        className={
                            'pi mr-2 p-button-icon-only ' +
                            (state.pending == null &&
                            editorState.selectMode === 'radius'
                                ? 'p-button-outlined'
                                : '')
                        }
                        tooltip="Radius Select"
                        onClick={() => {
                            if (state.pending != null) {
                                dispatch({ type: 'pending:type', kind: null });
                            }
                            setEditorState((es) => ({
                                ...es,
                                selectMode: 'radius',
                            }));
                        }}
                    >
                        <ToolIcon circles={[[{ x: 5, y: 5 }, 5]]} />
                    </Button>
                    <Button
                        className={
                            'pi p-button-icon-only ' +
                            (state.pending == null &&
                            editorState.selectMode === 'radius'
                                ? 'p-button-outlined'
                                : '')
                        }
                        tooltip="Expand All The Things"
                        onClick={() => {
                            if (state.selection?.type === 'Path') {
                                const more = findAdjacentPaths(
                                    state.selection.ids,
                                    state.paths,
                                );
                                dispatch({
                                    type: 'selection:set',
                                    selection: {
                                        type: 'Path',
                                        ids: state.selection.ids.concat(more),
                                    },
                                });
                            }
                            // if (state.pending != null) {
                            //     dispatch({ type: 'pending:type', kind: null });
                            // }
                            // setEditorState((es) => ({
                            //     ...es,
                            //     selectMode: 'radius'
                            // }));
                        }}
                    >
                        Ex
                    </Button>
                </div>
            </div>
            <Button
                tooltip="Pan (or shift+scroll)"
                icon="pi pi-arrows-alt"
                className={
                    'mt-2 ' +
                    (state.pending == null && !editorState.selectMode
                        ? 'p-button-outlined'
                        : '')
                }
                onClick={() => {
                    if (state.pending != null) {
                        dispatch({ type: 'pending:type', kind: null });
                        setEditorState((es) => ({
                            ...es,
                            selectMode: false,
                        }));
                    } else {
                        setEditorState((es) => ({
                            ...es,
                            selectMode: !es.selectMode,
                        }));
                    }
                }}
            />
            <Button
                tooltip={'New shape (n)'}
                className={
                    'mt-2 p-button-icon-only ' +
                    (editorState.pending !== null ? 'p-button-outlined' : '')
                }
                onClick={(evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    startPath();
                }}
                children={
                    <ToolIcon
                        points={[
                            { x: 0, y: 0 },
                            { x: 10, y: 0 },
                            { x: 5, y: 5 },
                            { x: 10, y: 10 },
                            { x: 0, y: 10 },
                        ]}
                        lines={[
                            [
                                { x: 0, y: 0 },
                                { x: 10, y: 0 },
                            ],
                            [
                                { x: 10, y: 0 },
                                { x: 5, y: 5 },
                            ],
                            [
                                { x: 5, y: 5 },
                                { x: 10, y: 10 },
                            ],
                            [
                                { x: 10, y: 10 },
                                { x: 0, y: 10 },
                            ],
                            [
                                { x: 0, y: 0 },
                                { x: 0, y: 10 },
                            ],
                        ]}
                    />
                }
            />
            {Object.entries({
                Line: (
                    <ToolIcon
                        points={[
                            { x: 0, y: 0 },
                            { x: 10, y: 10 },
                        ]}
                        lines={[
                            [
                                { x: 0, y: 0 },
                                { x: 10, y: 10 },
                            ],
                        ]}
                    />
                ),
                Perpendicular: (
                    <ToolIcon
                        points={[
                            { x: 5, y: 2 },
                            { x: 5, y: 10 },
                        ]}
                        lines={[
                            [
                                { x: -2, y: 2 },
                                { x: 12, y: 2 },
                            ],
                        ]}
                    />
                ),
                PerpendicularBisector: (
                    <ToolIcon
                        points={[
                            { x: 0, y: 5 },
                            { x: 10, y: 5 },
                        ]}
                        lines={[
                            [
                                { x: 5, y: -2 },
                                { x: 5, y: 12 },
                            ],
                        ]}
                    />
                ),
                AngleBisector: (
                    <ToolIcon
                        points={[
                            { x: 0, y: 0 },
                            { x: 10, y: 10 },
                            { x: 0, y: 10 },
                        ]}
                        lines={[
                            [
                                { x: 10, y: 0 },
                                { x: 0, y: 10 },
                            ],
                        ]}
                    />
                ),
                Circle: (
                    <ToolIcon
                        circles={[[{ x: 5, y: 5 }, 5]]}
                        points={[
                            { x: 5, y: 0 },
                            { x: 5, y: 5 },
                        ]}
                    />
                ),
                CircumCircle: (
                    <ToolIcon
                        circles={[[{ x: 5, y: 5 }, 5]]}
                        points={[
                            push({ x: 5, y: 5 }, Math.PI / 4, 5),
                            push({ x: 5, y: 5 }, -Math.PI / 4, 5),
                            push({ x: 5, y: 5 }, Math.PI, 5),
                        ]}
                    />
                ),
                InCircle: (
                    <ToolIcon
                        circles={[[{ x: 3, y: 5 }, 3]]}
                        points={[
                            { x: 0, y: 0 },
                            { x: 0, y: 10 },
                            { x: 10, y: 5 },
                        ]}
                    />
                ),
                Split: (
                    <ToolIcon
                        // circles={[[{ x: 3, y: 5 }, 3]]}
                        points={[
                            { x: 0, y: 0 },
                            { x: 3.33, y: 3.33 },
                            { x: 6.66, y: 6.66 },
                            { x: 10, y: 10 },
                        ]}
                        lines={
                            [
                                // [
                                //     { x: 0, y: 0 },
                                //     { x: 10, y: 10 },
                                // ],
                            ]
                        }
                    />
                ),
            }).map(([kind, icon]) => (
                <Button
                    key={kind}
                    tooltip={kind + ` (${toTypeRev[kind]})`}
                    icon={typeof icon === 'string' ? `pi ${icon}` : undefined}
                    className={
                        'mt-2 p-button-icon-only ' +
                        (state.pending?.type === 'Guide' &&
                        state.pending.kind === kind
                            ? 'p-button-outlined'
                            : '')
                    }
                    onClick={() => {
                        state.pending?.type === 'Guide' &&
                        state.pending.kind === kind
                            ? dispatch({ type: 'pending:type', kind: null })
                            : dispatch({
                                  type: 'pending:type',
                                  kind: kind as GuideGeom['type'],
                              });
                    }}
                    children={typeof icon === 'string' ? undefined : icon}
                />
            ))}
            <Button
                tooltip="Outline a Tiling"
                className={
                    'mt-2 ' +
                    (editorState.pending?.type === 'tiling'
                        ? 'p-button-outlined'
                        : '')
                }
                onClick={() => {
                    if (editorState.pending?.type === 'tiling') {
                        setEditorState((es) => ({ ...es, pending: null }));
                    } else {
                        setEditorState((es) => ({
                            ...es,
                            pending: { type: 'tiling', points: [] },
                        }));
                    }
                }}
                children={
                    <ToolIcon
                        lines={[
                            [
                                { x: 10, y: 2 },
                                { x: 0, y: 10 },
                            ],
                            [
                                { x: 0, y: 10 },
                                { x: 10, y: 10 },
                            ],
                            [
                                { x: 10, y: 10 },
                                { x: 10, y: 2 },
                            ],
                        ]}
                    />
                }
            />
        </div>
    );
}
