import React from 'react';
import {Coord} from '../../../types';
import {State} from './animator.utils';

export function SaveLinesButton({
    setPending,
    pending,
    setState,
    state,
    preview,
}: {
    setPending: React.Dispatch<React.SetStateAction<{selected?: number; points: Coord[]} | null>>;
    pending: {selected?: number; points: Coord[]};
    setState: React.Dispatch<React.SetStateAction<State>>;
    state: State;
    preview: number;
}): React.ReactNode {
    return (
        <button
            className="btn"
            onClick={() => {
                setPending(null);
                if (pending.selected != null) {
                    setState({
                        ...state,
                        lines: state.lines.map((line, i) =>
                            i === pending.selected
                                ? line.keyframes.some((k) => k.at === preview)
                                    ? {
                                          ...line,
                                          keyframes: line.keyframes.map((k) =>
                                              k.at === preview
                                                  ? {
                                                        ...k,
                                                        points: pending.points,
                                                    }
                                                  : k,
                                          ),
                                      }
                                    : {
                                          ...line,
                                          keyframes: [
                                              ...line.keyframes,
                                              {
                                                  at: preview,
                                                  points: pending.points,
                                              },
                                          ].sort((a, b) => a.at - b.at),
                                      }
                                : line,
                        ),
                    });
                } else {
                    setState({
                        ...state,
                        lines: [
                            ...state.lines,
                            {
                                keyframes: [
                                    {
                                        at: preview,
                                        points: pending.points,
                                    },
                                ],
                            },
                        ],
                    });
                }
            }}
        >
            Finish
        </button>
    );
}
