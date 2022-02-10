// This is for tests? idk
import * as React from 'react';
import { render } from 'react-dom';
import {
    cleanUpInsetSegments,
    cleanUpInsetSegments2,
} from '../src/rendering/findInternalRegions';
import { push } from '../src/rendering/getMirrorTransforms';
import { insetSegmentsBeta } from '../src/rendering/insetPath';
import { ensureClockwise } from '../src/rendering/pathToPoints';
import { Path, Segment } from '../src/types';
import { Canvas } from './Canvas';
import { ShowExample } from './ShowExample';
import { fixture } from './fixture';
import { Timeline } from './TimelineTest';

export const size = 500;

/**
 *
 * Ok so the basic idea is that I can test my inset code
 * with various test cases.
 *
 * And I can construct the line segments manually
 * by clicking control points.
 */

/*
Ok, test case format:
- input path (list of segments)
- for various inset numbers, have the passing output, if it exists

So when we're looking at a case, we can say "this passes" or "this doesn't"


*/

export const insetColors = ['#0f0', '#00f', '#ff0', '#f0f', '#0ff'];

export type Example = {
    input: Array<Segment>;
    output: Insets;
    title: string;
    id: number;
};

const maxId = (examples: Array<Example>) => {
    return examples.reduce((max, ex) => Math.max(ex.id, max), -1);
};

const App = () => {
    const [examples, setExamples] = React.useState([] as Array<Example>);
    const [initial, setInitial] = React.useState(
        fixture as null | Array<Segment>,
    );

    React.useEffect(() => {
        fetch(`/cases/`)
            .then((res) => res.json())
            .then((data: Array<Example>) => {
                data.forEach((data) => {
                    let output: Example['output'] = {};
                    Object.keys(data.output).forEach((k) => {
                        if (data.output[+k]) {
                            output[+k] = data.output[+k];
                        }
                    });
                    data.output = output;
                });
                setExamples(data);
            });
    }, []);

    React.useEffect(() => {
        if (examples.length === 0) {
            return;
        }
        fetch(`/cases/`, {
            method: 'POST',
            body: JSON.stringify(examples),
        });
    }, [examples]);

    return (
        <div style={{ margin: 48 }}>
            <Canvas
                initial={initial}
                onComplete={(segments, title) => {
                    setExamples((ex) =>
                        ex.concat({
                            id: maxId(examples) + 1,
                            input: segments,
                            output: getInsets(segments),
                            title,
                        }),
                    );
                }}
            />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    // overflow: 'auto',
                    flexWrap: 'wrap',
                }}
            >
                {examples.map((example, i) => (
                    <ShowExample
                        key={i}
                        example={example}
                        onClick={() => {
                            setInitial(example.input);
                            setTimeout(() => {
                                setInitial(null);
                            }, 100);
                        }}
                        onDelete={() => {
                            setExamples((ex) => {
                                ex = ex.slice();
                                ex.splice(i, 1);
                                return ex;
                            });
                        }}
                        onChange={(example) => {
                            setExamples((ex) => {
                                ex = ex.slice();
                                ex[i] = example;
                                return ex;
                            });
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export const pathSegs = (segments: Array<Segment>): Path => ({
    ...blankPath,
    segments,
    origin: segments[segments.length - 1].to,
});

export type Insets = {
    [key: number]: {
        paths: Array<Array<Segment>>;
        pass: boolean;
    };
};

/*

ok so https://mcmains.me.berkeley.edu/pubs/DAC05OffsetPolygon.pdf

I think I need to modify things so that I never shrink lines, only grow them.
and then it seems like it might work?

ok, so that's done.
Now I just need to segment, and do winding numbers?

*/

export function getInsets(segments: Segment[]) {
    const insets: Insets = {};
    if (segments.length > 1) {
        segments = ensureClockwise(segments);
        for (let i = -2; i < 3; i++) {
            const inset = i * 20 + 20;
            if (inset != 0) {
                // const insetted = insetSegmentsBeta(segments, inset);
                // const result = segmentsToNonIntersectingSegments(insetted);
                // const regions = findClockwiseRegions(
                //     result.result,
                //     result.froms,
                // );
                // insets[inset] = {
                //     paths: insetted.length ? [insetted] : [],
                //     pass: false,
                // };
                insets[inset] = {
                    paths: cleanUpInsetSegments2(
                        insetSegmentsBeta(segments, inset),
                    ),
                    pass: false,
                };
                // insets[inset] = {
                //     paths: insetted.length
                //         ? pruneInsetPath(insetted).filter((s) => s.length)
                //         : [],
                //     pass: false,
                // };
            }
        }
    }
    return insets;
}

const blankPath: Path = {
    segments: [],
    origin: { x: 0, y: 0 },
    created: 0,
    group: null,
    hidden: false,
    open: false,
    id: '',
    ordering: 0,
    style: {
        lines: [],
        fills: [],
    },
    clipMode: 'none',
};

render(<App />, document.getElementById('root'));
// render(<Timeline />, document.getElementById('root'));
