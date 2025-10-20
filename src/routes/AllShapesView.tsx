import {getPatternData, canonicalShape} from './getPatternData';
import {normShape} from './pattern';

export const AllShapesView = ({
    data,
}: {
    data: Record<string, ReturnType<typeof getPatternData>>;
}) => {
    const allShapes: Record<
        string,
        {shape: ReturnType<typeof canonicalShape>; patterns: {hash: string; count: number}[]}
    > = {};
    Object.entries(data).forEach(([hash, {canons}]) => {
        const canonKeys: Record<string, {shape: ReturnType<typeof canonicalShape>; count: number}> =
            {};
        canons.forEach((c) => {
            if (c.percentage) {
                if (!canonKeys[c.key]) {
                    canonKeys[c.key] = {shape: c, count: 0};
                } else {
                    canonKeys[c.key].count += c.percentage;
                }
            }
        });
        Object.entries(canonKeys).forEach(([key, value]) => {
            if (allShapes[key]) {
                allShapes[key].patterns.push({hash, count: value.count});
            } else {
                allShapes[key] = {shape: value.shape, patterns: [{hash, count: value.count}]};
            }
        });
    });

    return (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
            {Object.values(allShapes)
                .sort((a, b) => b.patterns.length - a.patterns.length)
                .map(({shape, patterns}, i) => {
                    const points = normShape(shape.scaled);
                    return (
                        <div key={shape.key}>
                            <svg
                                data-key={shape.key}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="-1 -1 2 2"
                                style={{
                                    background: 'black',
                                    width: 50,
                                    height: 50,
                                    margin: 5,
                                }}
                            >
                                <path
                                    fill="green"
                                    d={
                                        `M` +
                                        points
                                            .map(({x, y}) => `${x.toFixed(3)} ${y.toFixed(3)}`)
                                            .join('L') +
                                        'Z'
                                    }
                                />
                                <text
                                    x={0}
                                    y={0.25}
                                    style={{textAlign: 'center'}}
                                    fontSize={1}
                                    fill="white"
                                    textAnchor="middle"
                                >
                                    {patterns.length}
                                </text>
                            </svg>
                        </div>
                    );
                })}
        </div>
    );
};
