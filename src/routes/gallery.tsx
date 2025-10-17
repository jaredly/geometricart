import {useLoaderData} from 'react-router';
import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {SimpleTiling} from '../editor/SimpleTiling';
// import {ShowTiling} from '../editor/ShowTiling';
import {Tiling} from '../types';
import {applyTilingTransforms, getTransform, tilingPoints} from '../editor/tilingPoints';
import {boundsForCoords} from '../editor/Bounds';
import {applyMatrices} from '../rendering/getMirrorTransforms';
import {tilingTransforms} from '../editor/tilingTransforms';

export async function loader(_: Route.LoaderArgs) {
    return getAllPatterns();
}

const ShowTiling = ({tiling}: {tiling: Tiling}) => {
    const pts = tilingPoints(tiling.shape);
    const tx = getTransform(pts);
    const bounds = pts.map((pt) => applyMatrices(pt, tx));
    const {x0, y0, x1, y1} = boundsForCoords(...pts);
    const w = x1 - x0;
    const h = y1 - y0;
    const m = Math.min(w, h) / 10;

    const ttt = tilingTransforms(tiling.shape, bounds[2], bounds);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-2 -2 4 4"
            style={{background: 'black', width: 400, height: 400}}
        >
            <path
                fill="rgb(100,255,100,0.2)"
                d={bounds.map(({x, y}, i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')}
            />
            {applyTilingTransforms(
                tiling.cache.segments.map((s) => [s.prev, s.segment.to]),
                ttt,
            ).map(([a, b]) => (
                <path stroke="green" strokeWidth={0.01} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} />
            ))}
            {tiling.cache.segments.map((seg) => (
                <path
                    stroke="#00ff00"
                    strokeWidth={0.005}
                    d={`M${seg.prev.x} ${seg.prev.y} L${seg.segment.to.x} ${seg.segment.to.y}`}
                />
            ))}
        </svg>
    );
};

export const Gallery = ({loaderData}: Route.ComponentProps) => {
    return (
        <div>
            <h1> Galley page </h1>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                {loaderData.slice(0, 35).map((item) => (
                    <div key={item.hash}>
                        <div style={{fontSize: 8}}>{item.hash}</div>
                        <ShowTiling tiling={item.tiling} />
                    </div>
                ))}
            </div>
        </div>
    );
};
export default Gallery;
