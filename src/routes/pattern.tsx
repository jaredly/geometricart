import {useLoaderData, useParams} from 'react-router';
import {ShowTiling} from './ShowTiling';
import type {Route} from './+types/pattern';
import {getPattern} from './db.server';
import {useMemo} from 'react';
import {canonicalShape, getPatternData, humanReadableFraction} from './getPatternData';
import {findBoundingRect} from '../editor/Export';
import {addCoordToBounds, newPendingBounds} from '../editor/Bounds';
import {
    angleTo,
    applyMatrices,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {flipPattern, joinAdjacentShapeSegments} from './shapesFromSegments';
import {closeEnoughAngle} from '../rendering/epsilonToZero';
import {Coord} from '../types';

export async function loader({params}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    return getPattern(params.id);
}

export const Pattern = () => {
    const {id} = useParams();
    let pattern = useLoaderData<typeof loader>();

    const tiling = pattern ? flipPattern(pattern.tiling) : null;
    // if (pattern) flipPattern(pattern.tiling);
    const data = useMemo(() => (tiling ? getPatternData(tiling) : null), [tiling]);
    if (!pattern || !tiling || !data || !id) {
        return <div>No data... {id}</div>;
    }

    const canonKeys: Record<string, ReturnType<typeof canonicalShape> & {percentage: number}> = {};
    data.canons.forEach((c) => {
        if (c.percentage) {
            if (!canonKeys[c.key]) {
                canonKeys[c.key] = {...c};
            } else {
                canonKeys[c.key].percentage += c.percentage;
            }
        }
    });

    return (
        <div css={{padding: 10}}>
            Hello pattern {id}
            <div>
                <ShowTiling hash={id} size={500} data={data} />
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {
                        //data.canons
                        Object.values(canonKeys).map((shape, i) => {
                            const points = normShape(shape.scaled);

                            return (
                                <div key={i}>
                                    <svg
                                        data-key={shape.key}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="-1 -1 2 2"
                                        style={{
                                            background: 'black',
                                            width: 200,
                                            height: 200,
                                            margin: 5,
                                        }}
                                    >
                                        <path
                                            fill="green"
                                            d={
                                                `M` +
                                                points
                                                    .map(
                                                        ({x, y}) =>
                                                            `${x.toFixed(3)} ${y.toFixed(3)}`,
                                                    )
                                                    .join('L') +
                                                'Z'
                                            }
                                        />
                                    </svg>
                                    <div>{humanReadableFraction(shape.percentage)}</div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </div>
    );
};
export default Pattern;

export const normShape = (shape: Coord[]) => {
    const bounds = newPendingBounds();
    shape.forEach((coord) => addCoordToBounds(bounds, coord));
    const w = bounds.x1! - bounds.x0!;
    const h = bounds.y1! - bounds.y0!;
    const dim = Math.max(w, h);
    const tx = [
        translationMatrix({x: -w / 2 - bounds.x0!, y: -h / 2 - bounds.y0!}),
        scaleMatrix(1.5 / dim, 1.5 / dim),
    ];
    return shape.map((coord) => applyMatrices(coord, tx));
};
