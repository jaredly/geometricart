import * as React from 'react';
import { mergeBounds, segmentsBounds } from '../src/Export';
import { Text } from '../src/Forms';
import { calcPathD } from '../src/RenderPath';
import { Example, getInsets, insetColors, size, pathSegs } from './run';

export const ShowExample = ({
    example,
    onChange,
    onDelete,
}: {
    example: Example;
    onChange: (ex: Example) => void;
    onDelete: () => void;
}) => {
    const { input: segments, output: _insets, title } = example;

    const insets = React.useMemo(() => {
        return getInsets(segments);
    }, [segments]);

    const bounds = React.useMemo(() => {
        let bounds = segmentsBounds(segments);
        Object.keys(insets).forEach((k) => {
            insets[+k].paths.forEach((inset) => {
                bounds = mergeBounds(bounds, segmentsBounds(inset));
            });
        });
        return bounds;
    }, [segments, insets]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {Object.keys(insets)
                        .sort()
                        .map((k, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    const output = { ...insets };
                                    output[+k] = {
                                        ...insets[+k],
                                        pass: !insets[+k].pass,
                                    };
                                    onChange({
                                        ...example,
                                        output,
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    border: `2px ${
                                        insets[+k].pass ? 'solid' : 'dotted'
                                    } ${insetColors[i]}`,
                                    background: 'none',
                                    borderRadius: 0,
                                    color: 'white',
                                    margin: 4,
                                    cursor: 'pointer',
                                }}
                            >
                                {insets[+k].pass ? 'P' : 'F'}
                            </button>
                        ))}
                </div>
                {/* <button
                    onClick={() => {
                        setEdit(false);
                    }}
                >
                    Save
                </button> */}
                <button
                    onClick={() => {
                        onDelete();
                    }}
                >
                    Delete
                </button>
            </div>
            <svg
                width={size / 3}
                height={size / 3}
                viewBox={`${bounds.x0 - 10} ${bounds.y0 - 10} ${
                    bounds.x1 - bounds.x0 + 20
                } ${bounds.y1 - bounds.y0 + 20}`}
            >
                <path
                    stroke={'red'}
                    strokeWidth={3}
                    d={calcPathD(pathSegs(segments), 1)}
                />
                {Object.keys(insets)
                    .sort()
                    .map((k, ki) =>
                        insets[+k].paths.map((segments, i) => (
                            <path
                                stroke={insetColors[ki]}
                                strokeDasharray={
                                    insets[+k].pass ? '' : `${(i + 1) * 2}`
                                }
                                key={`${k}:${i}`}
                                strokeWidth={1}
                                fill="none"
                                d={calcPathD(pathSegs(segments), 1)}
                            />
                        )),
                    )}
            </svg>
            <Text
                value={title}
                onChange={(title) => {
                    onChange({ ...example, title });
                }}
            />
        </div>
    );
};
