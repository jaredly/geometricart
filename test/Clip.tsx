import * as React from 'react';
import { calcPathD, pathSegs } from '../src/editor/RenderPath';
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
                    return (
                        <>
                            <path
                                stroke={'blue'}
                                strokeWidth={3}
                                fill="none"
                                d={calcPathD(pathSegs(other), 1)}
                            />
                        </>
                    );
                }}
            />
            <button onClick={() => setWhich('shape')}>Shape</button>
            <button onClick={() => setWhich('clip')}>Clip</button>
        </div>
    );
};
