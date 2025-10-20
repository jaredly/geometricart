import {useMemo} from 'react';
import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {getPatternData} from './getPatternData';
import {ShowTiling} from './ShowTiling';

export async function loader(_: Route.LoaderArgs) {
    return getAllPatterns();
}

export const Gallery = ({loaderData}: Route.ComponentProps) => {
    const data = useMemo(() => {
        console.time();
        const res = Object.fromEntries(
            loaderData
                // .filter((t) => t.hash === '3ec9815442a44a060745e6e3388f64f7c14a3787')
                // .filter((t) => t.hash === '2fe167ca7e5e06c71b0bbf555a7db33897dd2422')
                // .filter((t) => t.hash === '11e20b0b5c2acf8fbe077271c9dab02fd69ea419')
                .slice(0, 20)
                .map(({tiling, hash}) => {
                    return [hash, getPatternData(tiling)];
                }),
        );
        console.timeEnd();
        return res;
    }, [loaderData]);
    return (
        <div>
            <h1> Galley page </h1>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                {loaderData.map((item) =>
                    data[item.hash] ? (
                        <div key={item.hash}>
                            <div style={{fontSize: 8}}>{item.hash}</div>
                            <a href={`./pattern/${item.hash}`}>
                                <ShowTiling tiling={item.tiling} data={data[item.hash]} />
                            </a>
                        </div>
                    ) : null,
                )}
            </div>
        </div>
    );
};
export default Gallery;
