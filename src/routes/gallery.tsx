import {useMemo, useState} from 'react';
import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {getPatternData} from './getPatternData';
import {ShowTiling} from './ShowTiling';
import {shapeKey, Tiling} from '../types';
import {flipPattern} from './shapesFromSegments';

export async function loader(_: Route.LoaderArgs) {
    return getAllPatterns(); // .map((p) => ({...p, tiling: flipPattern(p.tiling)}));
}

type GroupBy = 'symmetry' | null;
type SortBy = 'complexity';

export const Gallery = ({loaderData}: Route.ComponentProps) => {
    const data = useMemo(() => {
        const res = Object.fromEntries(
            loaderData
                // .filter((t) => t.hash === '3ec9815442a44a060745e6e3388f64f7c14a3787')
                // .filter((t) => t.hash === '2fe167ca7e5e06c71b0bbf555a7db33897dd2422')
                // .filter((t) => t.hash === '11e20b0b5c2acf8fbe077271c9dab02fd69ea419')
                // .slice(0, 30)
                .map(({tiling, hash}) => {
                    return [hash, getPatternData(tiling)];
                }),
        );
        return res;
    }, [loaderData]);

    const [groupBy, setGroupBy] = useState<GroupBy>('symmetry');
    const [sortBy, setSortBy] = useState<{by: SortBy; down: boolean}>({
        by: 'complexity',
        down: true,
    });

    const patternsByHash: Record<string, Tiling> = {};
    loaderData.forEach((pattern) => (patternsByHash[pattern.hash] = pattern.tiling));
    const groups: Record<string, string[]> = {};
    if (groupBy === 'symmetry') {
        Object.entries(patternsByHash).forEach(([hash, {shape}]) => {
            const key = shapeKey(shape);
            if (!groups[key]) {
                groups[key] = [hash];
            } else {
                groups[key].push(hash);
            }
        });
    } else {
        groups['All'] = Object.keys(patternsByHash);
    }

    Object.values(groups).forEach((patterns) =>
        patterns.sort(
            (a, b) =>
                patternsByHash[sortBy.down ? b : a].cache.segments.length -
                patternsByHash[sortBy.down ? a : b].cache.segments.length,
        ),
    );

    return (
        <div>
            <h1> Galley page </h1>
            <div style={{display: 'flex', alignItems: 'center', gap: 4, padding: 12}}>
                Group
                <button
                    className={`btn btn-sm ${groupBy === 'symmetry' ? 'btn-accent' : ''}`}
                    onClick={() => setGroupBy(groupBy === 'symmetry' ? null : 'symmetry')}
                    style={{}}
                >
                    Symmetry
                </button>
                <div style={{flexBasis: 8}} />
                Sort
                <button
                    className={`btn btn-sm ${sortBy.by === 'complexity' ? 'btn-accent' : ''}`}
                    onClick={() =>
                        setSortBy(
                            sortBy.by === 'complexity'
                                ? {by: 'complexity', down: !sortBy.down}
                                : {by: 'complexity', down: true},
                        )
                    }
                >
                    Complexity {sortBy.down ? '🔽' : '🔼'}
                </button>
            </div>
            <div
                style={
                    {
                        // display: 'flex', flexDirection: 'column', gap: 24, padding: 24
                        // display: 'grid',
                        // gridAutoFlow: 'row dense',
                        // gridTemplateColumns: 'repeat(auto-fill, minmax(min-content, 1fr))',
                        // gap: '1rem',
                    }
                }
            >
                {Object.keys(groups)
                    .sort()
                    .map((key) => (
                        <div
                            key={key}
                            style={{
                                display: 'inline-flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                padding: '1rem',
                                margin: '0.5rem',
                                borderRadius: '0.5rem',
                            }}
                            className="bg-base-300"
                        >
                            <div>{key}</div>

                            <div
                                style={{
                                    gap: 12,
                                    flexDirection: 'row',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {groups[key].map((id) =>
                                    data[id] ? (
                                        <div key={id}>
                                            {/* <div style={{fontSize: 8}}>{id}</div> */}
                                            <a href={`./pattern/${id}`}>
                                                <ShowTiling
                                                    size={200}
                                                    tiling={patternsByHash[id]}
                                                    data={data[id]}
                                                />
                                            </a>
                                        </div>
                                    ) : null,
                                )}
                            </div>
                        </div>
                    ))}
                {/* {loaderData.map((item) =>
                    data[item.hash] ? (
                        <div key={item.hash}>
                            <div style={{fontSize: 8}}>{item.hash}</div>
                            <a href={`./pattern/${item.hash}`}>
                                <ShowTiling tiling={item.tiling} data={data[item.hash]} />
                            </a>
                        </div>
                    ) : null,
                )} */}
            </div>
        </div>
    );
};

export default Gallery;
