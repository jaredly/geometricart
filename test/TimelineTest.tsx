import React, {useMemo} from 'react';
import {useState} from 'react';
import {PointsEditor, pointsPathD} from '../src/animation/PointsEditor';
import {timelineFunction, timelineSegments} from '../src/editor/Canvas';
import {Coord, LerpPoint} from '../src/types';

const Timeline = () => {
    const [points, setPoints] = useState([] as Array<LerpPoint>);
    const size = 500;

    let fn = useMemo(() => timelineFunction({points, type: 'float', range: [0, 1]}), [points]);
    const segments = React.useMemo(() => {
        const seg = timelineSegments({points, type: 'float', range: [0, 1]});
        console.log(seg);
        return seg;
    }, [points]);
    // const bex = {
    //     y0: 0,
    //     c1: { x: 0, y: 0 },
    //     c2: { x: 1, y: 1 },
    //     y1: 1,
    // };
    // const bz = segments.find((s) => s.type === 'curve') as TLSegmentCurve;
    // const table = bz ? bz.lookUpTable : []; // ? createLookupTable(bz.bezier, 10) : [];
    // console.log(table);
    // fn = (x) => evaluateBezier(bex, x).y;

    const evaluated: Array<Coord> = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
        const p = (i + 0.5) / count;
        evaluated.push({x: p * size, y: fn(p) * size});
    }

    return (
        <div>
            {/* {segments.map((seg, i) => (
                <div key={i}>
                    {seg.type === 'straight' ? (
                        JSON.stringify(seg)
                    ) : (
                        <>{JSON.stringify(seg.bezier)}</>
                    )}
                </div>
            ))} */}
            {/* {JSON.stringify(points)} */}
            <PointsEditor current={points} setCurrentInner={setPoints} />
            <svg width={size} height={size}>
                <path
                    d={pointsPathD(size, points, size)}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={3}
                    fill="none"
                />
                <polyline
                    points={evaluated.map((p) => `${p.x},${p.y}`).join(' ')}
                    stroke="red"
                    strokeWidth={2}
                    fill="none"
                />
                {/* {table.map((t, i) => (
                    <circle
                        key={i}
                        cx={t.pos.x * size}
                        cy={t.pos.y * size}
                        r={t.t * 5 + 5}
                        color="blue"
                    />
                ))} */}
            </svg>
        </div>
    );
};
