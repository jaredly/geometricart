import React, {useMemo} from 'react';
import {Coord} from '../../../../types';
import {shapeD} from '../../../shapeD';
import {tlpos, evalLane} from '../evalEase';
import {State} from '../export-types';
import {JsonEditor} from './JsonEditor';

const LaneEditor = ({
    lane,
    onChange,
    ts,
}: {
    ts: number[];
    lane: Lane;
    onChange: (l: Lane) => void;
}) => {
    const m = 40;
    const w = ts.length * m;
    const h = lane.ys.length * m;
    const items = useMemo(() => {
        const items: React.ReactNode[] = [];

        {
            const ln = ts.reduce((a, b) => a + b, 0);
            let at = 0;
            const scale = w / ln;

            ts.forEach((t) => {
                lane.ys.forEach((v, y) => {
                    items.push(
                        <circle
                            cx={m + at * scale}
                            cy={y * m + m}
                            r={4}
                            stroke="red"
                            fill="none"
                            strokeWidth={1}
                        />,
                    );
                });
                at += t;
            });
            lane.ys.forEach((v, y) => {
                items.push(
                    <circle
                        cx={m + at * scale}
                        cy={y * m + m}
                        r={4}
                        stroke="red"
                        fill="none"
                        strokeWidth={1}
                    />,
                );
            });

            const pts: Coord[] = [];
            const min = Math.min(...lane.ys);
            const max = Math.max(...lane.ys);
            for (let t = 0; t <= 1; t += 0.001) {
                const x = w * t + m;
                const pos = tlpos(ts, t);
                const y = evalLane(lane, pos);
                pts.push({x, y: (1 - (y - min) / (max - min)) * (h - m) + m});
            }
            items.push(<path d={shapeD(pts, false)} stroke="white" strokeWidth={1} fill="none" />);
        }

        // // const line: Coord[] = [];
        // ts.forEach((t, i) => {
        //     const x = i * (w / (ts.length - 1)) + m;
        //     const y0 = (lane.ys.length - 1 - lane.values[i]) * (h / lane.ys.length) + m;
        //     if (i < ts.length - 1) {
        //         const x1 = (i + 1) * (w / (ts.length - 1)) + m;
        //         const y1 = (lane.ys.length - 1 - lane.values[i + 1]) * (h / lane.ys.length) + m;
        //         const ease = lane.easings[i] ?? 'straight';
        //         const pts = evalEase(ease, {x, y: y0}, {x: x1, y: y1});
        //         items.push(
        //             <path
        //                 d={shapeD(pts, false)}
        //                 strokeWidth={3}
        //                 stroke="red"
        //                 fill="none"
        //             />,
        //         );
        //     }
        //     lane.ys.forEach((value, j) => {
        //         const y = j * (h / lane.ys.length) + m;
        //         items.push(
        //             <circle cx={x} cy={y} r={5} fill="#fff" opacity={0.2} key={`${i}-${j}`} />,
        //         );
        //     });
        // });
        return items;
    }, [lane, ts, w, h]);
    return (
        <div>
            <div className="font-mono">{lane.name}</div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{background: 'black', width: w + m * 2, height: h + m}}
            >
                {items}
            </svg>
            <JsonEditor value={lane} onChange={onChange} label="Lane" />
        </div>
    );
};
type Timeline = State['styleConfig']['timeline'];
export const TimelineEditor = ({
    timeline,
    onChange,
}: {
    timeline: Timeline;
    onChange: (v: Timeline) => void;
}) => {
    return (
        <div>
            {timeline.lanes.map((lane, i) => (
                <LaneEditor
                    key={i}
                    lane={lane}
                    ts={timeline.ts}
                    onChange={(lane) => {
                        const lanes = timeline.lanes.slice();
                        lanes[i] = lane;
                        onChange({...timeline, lanes});
                    }}
                />
            ))}
        </div>
    );
};
export type Lane = State['styleConfig']['timeline']['lanes'][0];
