import {SetStateAction, useMemo} from 'react';
import {GuideElement} from '../../editor/GuideElement';
import {RenderPendingGuide} from '../../editor/RenderPendingGuide';
import {tilingPoints, applyTilingTransformsG} from '../../editor/tilingPoints';
import {getTilingTransforms} from '../../editor/tilingTransforms';
import {coordKey} from '../../rendering/coordKey';
import {applyMatrices} from '../../rendering/getMirrorTransforms';
import {intersections, lineToSlope} from '../../rendering/intersect';
import {geomToPrimitives} from '../../rendering/points';
import {Tiling, Coord, GuideGeom} from '../../types';
import {shapeD} from '../shapeD';
import {col} from './animator';
import {State, Pending, lineAt} from './animator.screen/animator.utils';

export function SvgCanvas({
    peggedZoom,
    size,
    setPos,
    showGuides,
    zoom,
    lineWidth,
    state,
    preview,
    patternMap,
    pending,
    pos,
    setPending,
    hover,
}: {
    peggedZoom: number;
    size: number;
    setPos: {
        (value: SetStateAction<{x: number; y: number}>): void;
        (arg0: {x: number; y: number}): void;
    };
    showGuides: boolean;
    zoom: number;
    lineWidth: number;
    state: State;
    preview: number;
    patternMap: {[k: string]: Tiling};
    pending: Pending | null;
    pos: {x: number; y: number};
    setPending: {
        (value: SetStateAction<Pending | null>): void;
        (
            arg0:
                | {points: Coord[]; type: 'line'; idx?: number}
                | {
                      points: Coord[];
                      type: 'Guide';
                      kind: GuideGeom['type'];
                      extent?: number;
                      toggle: boolean;
                      angle?: number;
                  },
        ): void;
    };
    hover: number | null;
}) {
    const visiblePoints: Record<string, Coord> = {};
    const add = (c: Coord) => {
        const k = coordKey(c);
        if (!visiblePoints[k]) visiblePoints[k] = c;
    };
    const primitives = state.guides?.flatMap((g) => geomToPrimitives(g)) ?? [];
    primitives.forEach((prim, i) => {
        for (let j = i + 1; j < primitives.length; j++) {
            intersections(prim, primitives[j]).forEach((c) => add(c));
        }
    });
    state.layers.forEach((layer, i) => {
        if (!layer.visible && i !== preview) return;
        patternMap[layer.pattern].cache.segments.forEach(({prev, segment}) => {
            add(prev);
            add(segment.to);
        });
        const pattern = patternMap[layer.pattern];
        const pts = tilingPoints(pattern.shape);
        pts.forEach((p) => add(p));
        const boundLines = pts.map((p, i) => lineToSlope(p, pts[i === 0 ? pts.length - 1 : i - 1]));

        boundLines.forEach((seg) => {
            primitives.forEach((prim) => {
                intersections(seg, prim).forEach((c) => add(c));
            });
        });
    });

    const pendingPoints: Record<string, true> = {};
    if (pending) {
        pending.points.forEach((coord) => (pendingPoints[coordKey(coord)] = true));
    }

    const ats = useMemo(
        () => state.lines.map((line) => lineAt(line.keyframes, preview, line.fade)),
        [state.lines, preview],
    );

    const {full, pts} = useMemo(() => {
        if (!state.layers.length) return {full: [], pts: []};
        const pt = patternMap[state.layers[0].pattern];
        const pts = tilingPoints(pt.shape);
        const ttt = getTilingTransforms(pt.shape, pts);
        return {
            full: applyTilingTransformsG(
                ats.filter(Boolean) as {points: Coord[]; alpha: number}[],
                ttt,
                (line, tx) => ({
                    points: line.points.map((coord) => applyMatrices(coord, tx)),
                    alpha: line.alpha,
                }),
            ),
            pts,
        };
    }, [ats, patternMap, state.layers]);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${-peggedZoom / 2} ${-peggedZoom / 2} ${peggedZoom} ${peggedZoom}`}
            style={size ? {background: 'black', width: size, height: size} : undefined}
            onMouseMove={(evt) => {
                const box = evt.currentTarget.getBoundingClientRect();
                setPos({
                    x: ((evt.clientX - box.left) / box.width - 0.5) * 3,
                    y: ((evt.clientY - box.top) / box.height - 0.5) * 3,
                });
            }}
        >
            {showGuides && (
                <path
                    d={shapeD(pts, true)}
                    fill="none"
                    stroke={'white'}
                    strokeWidth={0.01 * zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
            {full.map((line, i) => (
                <path
                    key={i}
                    d={shapeD(line.points, false)}
                    fill="none"
                    // opacity={line.alpha}
                    stroke={'rgb(205,127,1)'}
                    strokeWidth={(lineWidth / 200) * peggedZoom * line.alpha}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
            {showGuides &&
                state.layers.map((layer, i) =>
                    !layer.visible && i !== preview
                        ? null
                        : patternMap[layer.pattern].cache.segments.map(({prev, segment}, j) => (
                              <path
                                  key={`${i}-${j}`}
                                  d={shapeD([prev, segment.to], false)}
                                  fill="none"
                                  stroke={col(i)}
                                  //   opacity={0.5}
                                  strokeWidth={0.03}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                              />
                          )),
                )}
            {showGuides &&
                state.guides?.map((guide, i) => (
                    <GuideElement
                        key={i}
                        geom={guide}
                        zoom={1}
                        stroke={0.01}
                        bounds={{x0: -1, y0: -1, x1: 1, y1: 1}}
                        original
                    />
                ))}
            {pending?.type === 'line' ? (
                <path
                    d={shapeD(pending.points, false)}
                    fill="none"
                    stroke={'white'}
                    strokeWidth={0.03}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : null}
            {pending?.type === 'Guide' ? (
                <RenderPendingGuide
                    guide={pending}
                    zoom={1}
                    bounds={{x0: -1, y0: -1, x1: 1, y1: 1}}
                    mirror={null}
                    shiftKey={false}
                    stroke={0.01}
                    pos={pos}
                />
            ) : null}
            {pending
                ? Object.entries(visiblePoints).map(([key, coord]) => (
                      <circle
                          key={key}
                          cx={coord.x.toFixed(3)}
                          cy={coord.y.toFixed(3)}
                          r={0.04}
                          className="cursor-pointer"
                          fill={pendingPoints[key] ? 'orange' : 'white'}
                          opacity={0.7}
                          onClick={() =>
                              setPending({
                                  ...pending,
                                  points: [...pending.points, coord],
                              })
                          }
                      />
                  ))
                : null}
            {hover != null && ats[hover] ? (
                <>
                    <path
                        d={shapeD(ats[hover].points, false)}
                        stroke="white"
                        strokeWidth={0.04}
                        fill="none"
                    />
                    {ats[hover]?.points.map((coord, i) => (
                        <circle
                            key={i}
                            cx={coord.x.toFixed(3)}
                            cy={coord.y.toFixed(3)}
                            r={0.04}
                            stroke="white"
                            strokeWidth={0.01}
                            className="cursor-pointer"
                            fill={i === 0 ? 'black' : 'red'}
                        />
                    ))}
                </>
            ) : null}
        </svg>
    );
}
