import React, {useCallback, useMemo, useState} from 'react';
import {coordKey} from '../../../rendering/coordKey';
import {closeEnoughAngle} from '../../../rendering/epsilonToZero';
import {angleTo, dist} from '../../../rendering/getMirrorTransforms';
import {intersections, lineToSlope, Primitive} from '../../../rendering/intersect';
import {angleBetween} from '../../../rendering/isAngleBetween';
import {Coord, Segment, Tiling} from '../../../types';
import {findCommonFractions, showFract} from '../../findCommonFractions';
import {Crop, getNewPatternData} from '../../getPatternData';
import {humanReadableRatio} from '../../humanReadableRatio';
import {shapeD} from '../../shapeD';
import {unique} from '../../shapesFromSegments';
import {filterNull} from './filterNull';
import {IGuide} from './IGuide';
import {ShowLabel} from './ShowLabel';
import {svgCoord, useSVGZoom} from './useSVGZoom';
import {StateEditor} from './StateEditor';
import {State} from './export-types';

export const PatternExport = ({tiling}: {tiling: Tiling}) => {
    const size = 800;
    const [state, setState] = useState<State>({
        layers: {},
        crops: {},
        view: {ppi: 1, box: {x: -0.5, y: -0.5, width: 1, height: 2}},
        styleConfig: {
            seed: 0,
            clocks: [],
            palette: [],
        },
    });

    return (
        <div className="flex">
            <div>Hello this is big</div>
            <StateEditor value={state} onChange={setState} />
        </div>
    );
};

const guideMidpoint = (guide: IGuide) => {
    if (guide.type === 'circle') {
        return guide.p1;
    }
    return halfway(guide.p1, guide.p2);
};

const halfway = (one: Coord, two: Coord) => ({x: (one.x + two.x) / 2, y: (one.y + two.y) / 2});

const guideToPrimitive = (one: IGuide): Primitive =>
    one.type === 'line'
        ? lineToSlope(one.p1, one.p2, true)
        : {
              type: 'circle',
              center: one.p1,
              radius: dist(one.p1, one.p2),
          };

const allGuideIntersections = (guides: IGuide[]) => {
    const coords: Coord[] = [];
    const prims = guides.map(guideToPrimitive);
    for (let i = 0; i < prims.length; i++) {
        const gi = prims[i];
        for (let j = i + 1; j < prims.length; j++) {
            const gj = prims[j];
            coords.push(...intersections(gi, gj));
        }
    }
    return coords;
};

const getLabels = (guides: IGuide[]) => {
    // guides = guides.filter((g) => g.selected != null).sort((a, b) => a.selected! - b.selected!);
    // console.log('labesl', guides);
    const res: {
        left: number;
        right: number;
        label: {angle?: string; lengths: {left: string; right: string}};
        pos: Coord;
    }[] = [];
    for (let i = 0; i < guides.length; i++) {
        const gi = guides[i];
        if (gi.selected == null) continue;
        for (let j = i + 1; j < guides.length; j++) {
            const gj = guides[j];
            if (gj.selected == null) continue;
            const label = getLabel(gi, gj);
            if (label) {
                res.push({
                    label,
                    pos: halfway(guideMidpoint(gi), guideMidpoint(gj)),
                    left: j,
                    right: i,
                });
            }
        }
    }
    return res;
};

const showAngle = (angle: number) => {
    if (closeEnoughAngle(angle, 0)) {
        return '∥';
    }
    if (closeEnoughAngle(angle, Math.PI / 2)) {
        return '⊾';
    }
    const fract = findCommonFractions(angle / Math.PI);
    if (fract) {
        return showFract(fract) + 'π';
    }
    return (angle / Math.PI) * 180 + 'º';
};

const getLabel = (one: IGuide, two: IGuide) => {
    const d1 = dist(one.p1, one.p2);
    const d2 = dist(two.p1, two.p2);
    const rat = humanReadableRatio(d1, d2);
    if (one.type === 'line' && two.type === 'line') {
        let angle = angleBetween(angleTo(one.p1, one.p2), angleTo(two.p1, two.p2), true);
        if (angle > Math.PI) {
            angle = Math.PI * 2 - angle;
        }
        if (angle > Math.PI / 2) {
            angle = Math.PI - angle;
        }
        return {angle: showAngle(angle), lengths: rat};
    }
    return {lengths: rat};
};

const addSelected = (guides: IGuide[], i: number, max = 3) => {
    let current = guides
        .map((g, i) => (g.selected != null ? {s: g.selected, i} : null))
        .filter(filterNull)
        .sort((a, b) => a.s - b.s)
        .map((s) => s.i);
    current.push(i);
    if (current.length > max) {
        current = current.slice(-max);
    }
    return guides.map((g, i) =>
        current.includes(i) ? {...g, selected: current.indexOf(i)} : {...g, selected: undefined},
    );
};

const RenderGuide = React.memo(
    ({
        guide,
        color,
        hover,
        setHover,
        toggle,
        i,
    }: {
        i?: number;
        hover: boolean;
        setHover?: (i: number | null) => void;
        guide: IGuide;
        color?: string;
        toggle?: (i: number) => void;
    }) =>
        guide.type === 'line' ? (
            <line
                fill="none"
                stroke={color ?? 'white'}
                strokeWidth={hover ? 0.02 : 0.005}
                pointerEvents={i != null ? undefined : 'none'}
                onMouseEnter={() => setHover?.(i ?? null)}
                onMouseLeave={() => setHover?.(null)}
                onClick={() => toggle && i != null && toggle(i)}
                x1={guide.p1.x}
                y1={guide.p1.y}
                x2={guide.p2.x}
                y2={guide.p2.y}
                cursor={'pointer'}
            />
        ) : (
            <circle
                cx={guide.p1.x}
                cy={guide.p1.y}
                r={dist(guide.p1, guide.p2)}
                fill="none"
                pointerEvents={i != null ? undefined : 'none'}
                onMouseEnter={() => setHover?.(i ?? null)}
                onMouseLeave={() => setHover?.(null)}
                onClick={() => toggle && i != null && toggle(i)}
                stroke={color ?? 'white'}
                strokeWidth={hover ? 0.02 : 0.005}
                // pointerEvents={'none'}
                cursor={'pointer'}
            />
        ),
);

function shapeColor(data: ReturnType<typeof getNewPatternData>, i: number): string | undefined {
    return data.colorInfo.colors[i] === -1
        ? '#444'
        : `hsl(100 0% ${(data.colorInfo.colors[i] / (data.colorInfo.maxColor + 1)) * 40 + 30}%)`;
}

const AllShapes = React.memo(({data}: {data: ReturnType<typeof getNewPatternData>}) => {
    return data.shapes.map((shape, i) => (
        <path d={shapeD(shape)} key={i} fill={shapeColor(data, i)} stroke="none" />
    ));
});

const AllGuides = React.memo(
    ({
        guides,
        hover,
        toggle,
        setHover,
    }: {
        guides: IGuide[];
        hover: number | null;
        setHover?: (i: number | null) => void;
        toggle?: (i: number) => void;
    }) => {
        return guides.map((guide, i) => (
            <RenderGuide
                guide={guide}
                color={guide.selected != null ? 'magenta' : 'white'}
                toggle={toggle}
                hover={hover === i}
                i={i}
                setHover={setHover}
                key={i}
            />
        ));
    },
);
