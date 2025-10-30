import React from 'react';
import {LerpPoint} from '../types';
import {mulPos} from './mulPos';
import {pointsPathD, pointsPath} from './PointsEditor.pointsPathD.related';

export const PointsEditor = ({
    current,
    // setCurrent,
    setCurrentInner,
}: {
    current: Array<LerpPoint>;
    // setCurrent: (p: Array<TimelinePoint>) => void;
    setCurrentInner: (p: Array<LerpPoint> | ((p: Array<LerpPoint>) => Array<LerpPoint>)) => void;
}) => {
    // const [current, setCurrentInner] = React.useState(
    //     normalizePoints(points, 0, 1),
    // );
    const setCurrent = React.useCallback(
        (points: Array<LerpPoint> | ((p: Array<LerpPoint>) => Array<LerpPoint>)) => {
            if (typeof points === 'function') {
                setCurrentInner((p) => normalizePoints(points(p), 0, 1));
            } else {
                setCurrentInner(normalizePoints(points, 0, 1));
            }
        },
        [],
    );

    const svg = React.useRef(null as null | SVGElement);

    const width = 500;
    const height = 500;
    // const scale = { x: width, y: height };
    // const normalized = normalizePoints(current, 0, 1);
    const evtPos = React.useCallback((evt: {clientX: number; clientY: number}) => {
        const box = svg.current!.getBoundingClientRect();
        return {
            x: (evt.clientX - box.left - 10) / width,
            y: (evt.clientY - box.top - 10) / height,
        };
    }, []);

    const changePoint = (point: LerpPoint, i: number) =>
        setCurrent((c) => {
            const n = current.slice();
            n[i] = point;
            return n;
        });

    const path = pointsPathD(height, current, width);

    // const path = pointsPath([
    //     { pos: { x: 0, y: height } },
    //     ...current.map((p) => ({
    //         pos: mulPos(p.pos, scale),
    //         leftCtrl: p.leftCtrl ? mulPos(p.leftCtrl, scale) : undefined,
    //         rightCtrl: p.rightCtrl ? mulPos(p.rightCtrl, scale) : undefined,
    //     })),
    //     { pos: { x: width, y: 0 } },
    // ]).join(' ');
    const [moving, setMoving] = React.useState(
        null as null | {i: number; which: 'pos' | 'leftCtrl' | 'rightCtrl'},
    );
    React.useEffect(() => {
        if (!moving) {
            return;
        }
        const fn = (evt: MouseEvent) => {
            evt.preventDefault();
            evt.stopPropagation();
            const pos = evtPos(evt);
            setCurrentInner((points) => {
                points = points.slice();
                points[moving.i] = {
                    ...points[moving.i],
                    [moving.which]:
                        moving.which === 'pos'
                            ? pos
                            : {
                                  x: pos.x - points[moving.i].pos.x,
                                  y: pos.y - points[moving.i].pos.y,
                              },
                };
                return points;
            });
        };
        const up = (evt: MouseEvent) => {
            evt.preventDefault();
            evt.stopPropagation();
            setMoving(null);
            setCurrent((c) => c);
        };
        document.addEventListener('mousemove', fn);
        document.addEventListener('mouseup', up);
        return () => {
            document.removeEventListener('mousemove', fn);
            document.removeEventListener('mouseup', up);
        };
    }, [moving]);

    return (
        <div>
            <svg
                style={{
                    border: '1px solid magenta',
                    display: 'block',
                }}
                ref={(node) => {
                    node ? (svg.current = node) : null;
                }}
                width={width + 20}
                height={height + 20}
                viewBox={`-10 -10 ${width + 20} ${height + 20}`}
                onClick={(evt) => {
                    if (evt.shiftKey || evt.metaKey) {
                        return;
                    }
                    const pos = evtPos(evt);
                    setCurrent(current.concat([{pos}]));
                }}
            >
                <path d={path} stroke="red" strokeWidth={1} fill="none" />
                {current.map((point, i) => (
                    <React.Fragment key={i}>
                        {point.leftCtrl ? (
                            <line
                                x1={point.pos.x * width}
                                y1={point.pos.y * height}
                                x2={(point.pos.x + point.leftCtrl.x) * width}
                                y2={(point.leftCtrl.y + point.pos.y) * height}
                                stroke="blue"
                                strokeWidth={1}
                            />
                        ) : null}
                        {point.rightCtrl ? (
                            <line
                                x1={point.pos.x * width}
                                y1={point.pos.y * height}
                                x2={(point.pos.x + point.rightCtrl.x) * width}
                                y2={(point.rightCtrl.y + point.pos.y) * height}
                                stroke="green"
                                strokeWidth={1}
                            />
                        ) : null}
                        <circle
                            key={i}
                            cx={point.pos.x * width}
                            cy={point.pos.y * height}
                            r={5}
                            fill="red"
                            onMouseDown={(evt) => {
                                evt.stopPropagation();
                                evt.preventDefault();
                                setMoving({i, which: 'pos'});
                            }}
                            onClick={(evt) => {
                                evt.stopPropagation();
                                evt.preventDefault();
                                if (evt.shiftKey) {
                                    const n = current.slice();
                                    n.splice(i, 1);
                                    return setCurrent(n);
                                }
                                if (evt.metaKey) {
                                    if (point.leftCtrl || point.rightCtrl) {
                                        changePoint({pos: point.pos}, i);
                                    } else {
                                        changePoint(
                                            {
                                                pos: point.pos,
                                                leftCtrl: point.leftCtrl || {
                                                    x: -0.1,
                                                    y: 0,
                                                },
                                                rightCtrl: point.rightCtrl || {
                                                    x: 0.1,
                                                    y: 0,
                                                },
                                            },
                                            i,
                                        );
                                    }
                                }
                            }}
                        />
                        {point.leftCtrl ? (
                            <circle
                                key={i + 'l'}
                                cx={(point.pos.x + point.leftCtrl.x) * width}
                                cy={(point.leftCtrl.y + point.pos.y) * height}
                                r={5}
                                onMouseDown={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();
                                    setMoving({i, which: 'leftCtrl'});
                                }}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    if (evt.shiftKey) {
                                        setCurrent((points) => {
                                            points = points.slice();
                                            points[i] = {
                                                ...points[i],
                                                leftCtrl: undefined,
                                            };
                                            return points;
                                        });
                                    }
                                }}
                                fill="blue"
                            />
                        ) : null}
                        {point.rightCtrl ? (
                            <circle
                                key={i + 'r'}
                                cx={(point.pos.x + point.rightCtrl.x) * width}
                                cy={(point.rightCtrl.y + point.pos.y) * height}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    if (evt.shiftKey) {
                                        setCurrent((points) => {
                                            points = points.slice();
                                            points[i] = {
                                                ...points[i],
                                                rightCtrl: undefined,
                                            };
                                            return points;
                                        });
                                    }
                                }}
                                onMouseDown={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();

                                    setMoving({i, which: 'rightCtrl'});
                                }}
                                r={5}
                                fill="green"
                            />
                        ) : null}
                    </React.Fragment>
                ))}
            </svg>
        </div>
    );
};


function normalizePoints(current: LerpPoint[], min: number, max: number) {
    let sorted = current.slice().sort((a, b) => a.pos.x - b.pos.x);
    sorted = sorted.map((point, i) => {
        const prev = i === 0 ? min : sorted[i - 1].pos.x;
        const next = i === sorted.length - 1 ? max : sorted[i + 1].pos.x;
        let leftCtrl = point.leftCtrl
            ? {
                  ...point.leftCtrl,
                  x: Math.min(0, Math.max(prev - point.pos.x, point.leftCtrl.x)),
              }
            : undefined;
        let rightCtrl = point.rightCtrl
            ? {
                  ...point.rightCtrl,
                  x: Math.max(0, Math.min(next - point.pos.x, point.rightCtrl.x)),
              }
            : undefined;
        return {
            leftCtrl,
            rightCtrl,
            pos: {
                x: Math.max(0, Math.min(1, point.pos.x)),
                y: Math.max(0, Math.min(1, point.pos.y)),
            },
        };
    });
    return sorted;
}
