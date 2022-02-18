import * as React from 'react';
import { pathToPrimitives } from '../src/editor/findSelection';
import { calcPathD, pathSegs } from '../src/editor/RenderPath';
import { clipPath } from '../src/rendering/clipPath';
import { Segment } from '../src/types';
import { Drawing, useLocalStorage } from './Canvas';

export const Clip = () => {
    const [segments, setSegments] = useLocalStorage('clip-test2', {
        shape: [],
        clip: [],
    } as { shape: Array<Segment>; clip: Array<Segment> });
    const [which, setWhich] = React.useState('shape' as 'shape' | 'clip');
    return (
        <div>
            <Drawing
                key={which}
                zoom={1}
                segments={segments[which]}
                setSegments={(s) =>
                    setSegments((segments) => ({
                        ...segments,
                        [which]: s(segments[which]),
                    }))
                }
                onComplete={() => {}}
                snap={20}
                render={(segs) => {
                    const other =
                        segments[which === 'shape' ? 'clip' : 'shape'];
                    if (!other.length) {
                        return;
                    }
                    const clipped =
                        segments.shape.length > 2 && segments.clip.length > 2
                            ? clipPath(
                                  { ...pathSegs(segments.shape), debug: false },
                                  segments.clip,
                                  pathToPrimitives(segments.clip),
                              )
                            : null;
                    return (
                        <>
                            <path
                                stroke={'blue'}
                                strokeWidth={3}
                                fill="none"
                                d={calcPathD(pathSegs(other), 1)}
                            />
                            {clipped
                                ? clipped.map((segs, i) => (
                                      <path
                                          stroke={'white'}
                                          strokeWidth={1}
                                          fill="#aaa"
                                          opacity={0.5}
                                          key={i}
                                          d={calcPathD(segs, 1)}
                                      />
                                  ))
                                : null}
                        </>
                    );
                }}
            />
            <button
                disabled={which === 'shape'}
                onClick={() => setWhich('shape')}
            >
                Shape
            </button>
            <button
                disabled={which === 'clip'}
                onClick={() => setWhich('clip')}
            >
                Clip
            </button>
            <button onClick={() => setSegments({ shape: [], clip: [] })}>
                Clear
            </button>
        </div>
    );
};
