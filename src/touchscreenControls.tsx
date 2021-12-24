/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { MultiStyleForm } from './MultiStyleForm';
import {
    Action,
    Coord,
    guideTypes,
    Intersect,
    Path,
    PathMultiply,
    PendingType,
    Segment,
    State,
} from './types';
import { DrawPathState } from './DrawPath';
import { Primitive } from './intersect';
import { PendingPathControls } from './PendingPathControls';
import { EyeIcon, EyeInvisibleIcon } from './icons/Eyes';
import {
    BxSelectMultipleIcon,
    CancelIcon,
    DeleteForeverIcon,
    IconButton,
    PaintFillIcon,
    SelectDragIcon,
} from './icons/Icon';

export const idsToStyle = (state: State) => {
    if (
        state.selection?.type === 'PathGroup' ||
        state.selection?.type === 'Path'
    ) {
        return state.selection.type === 'PathGroup'
            ? Object.keys(state.paths).filter((k) =>
                  state.selection!.ids.includes(state.paths[k].group!),
              )
            : state.selection.ids;
    }
    return [];
};

export function touchscreenControls(
    state: State,
    dispatch: (action: Action) => unknown,
    setMultiSelect: React.Dispatch<React.SetStateAction<boolean>>,
    multiSelect: boolean,
    pendingPath: [
        DrawPathState | null,
        React.Dispatch<React.SetStateAction<DrawPathState | null>>,
    ],
    allIntersections: Intersect[],
    guidePrimitives: { prim: Primitive; guides: string[] }[],
    setDragSelect: (fn: (select: boolean) => boolean) => void,
    dragSelect: boolean,
    clearPendingMirror: null | (() => void),
    styleOpen: boolean,
    setStyleOpen: (fn: (select: boolean) => boolean) => void,
): React.ReactNode {
    const styleIds = idsToStyle(state);
    return (
        <div
            css={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                overflow: 'auto',
            }}
            onClick={(evt) => evt.stopPropagation()}
        >
            {styleIds.length && styleOpen
                ? (() => {
                      return (
                          <div
                              css={{
                                  backgroundColor: 'rgba(0,0,0,0.8)',
                              }}
                          >
                              <MultiStyleForm
                                  palette={state.palettes[state.activePalette]}
                                  styles={styleIds.map(
                                      (k) => state.paths[k].style,
                                  )}
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
                          </div>
                      );
                  })()
                : null}
            {state.selection ? (
                <div>
                    <IconButton
                        onClick={() => {
                            dispatch({
                                type: 'selection:set',
                                selection: null,
                            });
                        }}
                    >
                        <CancelIcon />
                    </IconButton>
                    <IconButton
                        selected={dragSelect}
                        onClick={() => {
                            setDragSelect((current) => !current);
                        }}
                    >
                        <SelectDragIcon />
                    </IconButton>
                    {styleIds.length ? (
                        <IconButton
                            onClick={() => {
                                setStyleOpen((s) => !s);
                            }}
                            selected={styleOpen}
                            // style={{
                            //     fontWeight: multiSelect ? 'bold' : 'normal',
                            // }}
                        >
                            <PaintFillIcon />
                        </IconButton>
                    ) : null}
                    {state.selection.type === 'PathGroup' ||
                    state.selection.type === 'Path' ? (
                        <IconButton
                            onClick={() => {
                                setMultiSelect((s) => !s);
                            }}
                            selected={multiSelect}
                            // style={{
                            //     fontWeight: multiSelect ? 'bold' : 'normal',
                            // }}
                        >
                            <BxSelectMultipleIcon />
                        </IconButton>
                    ) : null}
                    <IconButton
                        color="rgb(255,200,200)"
                        onClick={() => {
                            if (!state.selection) {
                                return;
                            }
                            switch (state.selection.type) {
                                case 'PathGroup':
                                    return state.selection.ids.forEach((id) =>
                                        dispatch({
                                            type: 'group:delete',
                                            id,
                                        }),
                                    );
                                case 'Path':
                                    return dispatch({
                                        type: 'path:delete:many',
                                        ids: state.selection.ids,
                                    });
                                case 'Guide':
                                    return state.selection.ids.forEach((id) =>
                                        dispatch({ type: 'guide:delete', id }),
                                    );
                            }
                        }}
                    >
                        <DeleteForeverIcon />
                    </IconButton>
                    {state.activeMirror &&
                    (state.selection.type === 'Path' ||
                        state.selection.type === 'PathGroup') ? (
                        <button
                            css={{ fontSize: '150%' }}
                            onClick={() => {
                                dispatch({
                                    type: 'path:multiply',
                                    selection:
                                        state.selection as PathMultiply['selection'],
                                    mirror: state.activeMirror!,
                                });
                            }}
                        >
                            Clone around mirror
                        </button>
                    ) : null}
                </div>
            ) : state.pending ? (
                <button
                    css={{
                        fontSize: 30,
                    }}
                    onClick={() =>
                        dispatch({ type: 'pending:type', kind: null })
                    }
                >
                    Cancel guide
                </button>
            ) : state.view.guides ? (
                <div>
                    <IconButton
                        onClick={() => {
                            dispatch({
                                type: 'view:update',
                                view: {
                                    ...state.view,
                                    guides: !state.view.guides,
                                },
                            });
                        }}
                    >
                        <EyeIcon />
                    </IconButton>
                    <IconButton
                        selected={dragSelect}
                        onClick={() => {
                            setDragSelect((current) => !current);
                        }}
                    >
                        <SelectDragIcon />
                    </IconButton>

                    <select
                        css={{
                            width: 140,
                            fontSize: 30,
                        }}
                        onChange={(evt) => {
                            dispatch({
                                type: 'pending:type',
                                kind: evt.target.value as PendingType['kind'],
                            });
                        }}
                        value={0}
                    >
                        <option value={0} disabled>
                            + Guide
                        </option>
                        {guideTypes.map((kind) => (
                            <option value={kind}>{kind}</option>
                        ))}
                    </select>
                </div>
            ) : (
                <div>
                    <IconButton
                        onClick={() => {
                            dispatch({
                                type: 'view:update',
                                view: {
                                    ...state.view,
                                    guides: !state.view.guides,
                                },
                            });
                        }}
                    >
                        <EyeInvisibleIcon />
                    </IconButton>
                    <IconButton
                        selected={dragSelect}
                        onClick={() => {
                            setDragSelect((current) => !current);
                        }}
                    >
                        <SelectDragIcon />
                    </IconButton>
                </div>
            )}
            {clearPendingMirror ? (
                <button
                    css={{
                        fontSize: 30,
                    }}
                    onClick={() => clearPendingMirror()}
                >
                    Cancel mirror
                </button>
            ) : null}

            {pendingPath[0] ? (
                <PendingPathControls
                    pendingPath={pendingPath}
                    allIntersections={allIntersections}
                    guidePrimitives={guidePrimitives}
                    onComplete={(
                        isClip: boolean,
                        origin: Coord,
                        segments: Array<Segment>,
                    ) => {
                        if (isClip) {
                            dispatch({
                                type: 'clip:add',
                                clip: segments,
                            });
                        } else {
                            dispatch({
                                type: 'path:create',
                                segments,
                                origin,
                            });
                        }
                    }}
                />
            ) : null}
        </div>
    );
}
