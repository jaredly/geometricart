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
    clearPendingMirror?: () => void,
): React.ReactNode {
    return (
        <div
            css={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
            }}
            onClick={(evt) => evt.stopPropagation()}
        >
            {state.selection?.type === 'PathGroup' ||
            state.selection?.type === 'Path'
                ? (() => {
                      const ids =
                          state.selection.type === 'PathGroup'
                              ? Object.keys(state.paths).filter((k) =>
                                    state.selection!.ids.includes(
                                        state.paths[k].group!,
                                    ),
                                )
                              : state.selection.ids;
                      return (
                          <div
                              css={{
                                  backgroundColor: 'rgba(0,0,0,0.8)',
                              }}
                          >
                              <MultiStyleForm
                                  palette={state.palettes[state.activePalette]}
                                  styles={ids.map((k) => state.paths[k].style)}
                                  onChange={(styles) => {
                                      const changed: {
                                          [key: string]: Path;
                                      } = {};
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
                          </div>
                      );
                  })()
                : null}
            {state.selection ? (
                <div>
                    <button
                        css={{ fontSize: '150%' }}
                        onClick={() => {
                            dispatch({
                                type: 'selection:set',
                                selection: null,
                            });
                        }}
                    >
                        Clear selection
                    </button>
                    {state.selection.type === 'PathGroup' ||
                    state.selection.type === 'Path' ? (
                        <button
                            css={{ fontSize: '150%' }}
                            onClick={() => {
                                setMultiSelect((s) => !s);
                            }}
                            style={{
                                fontWeight: multiSelect ? 'bold' : 'normal',
                            }}
                        >
                            Multi-select
                        </button>
                    ) : null}
                    <button
                        css={{ fontSize: '150%' }}
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
                        Delete {state.selection.type}
                    </button>
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
            ) : (
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
