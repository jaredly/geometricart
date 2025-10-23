import {useEffect, useRef, useState} from 'react';
import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {getPatternData} from './getPatternData';
import {ShowTiling} from './ShowTiling';
import {shapeKey, Tiling} from '../types';
import {ShapeDialog} from './ShapeDialog';
import {getUniqueShapes} from './getUniqueShapes';
import {useSearchParams} from 'react-router';

export async function loader(data: Route.LoaderArgs) {
    const limit = new URL(data.request.url).searchParams.get('limit');
    let plain = getAllPatterns();
    // .filter((t) => t.hash === '3ec9815442a44a060745e6e3388f64f7c14a3787')
    // .filter((t) => t.hash === '2fe167ca7e5e06c71b0bbf555a7db33897dd2422')
    // .filter((t) => t.hash === '11e20b0b5c2acf8fbe077271c9dab02fd69ea419')
    if (limit) {
        if ((+limit).toString() === limit) {
            plain = plain.slice(0, +limit);
        } else [(plain = plain.filter((t) => t.hash === limit))];
    }
    const patterns = plain.map((pattern) => ({...pattern, data: getPatternData(pattern.tiling)}));

    return {patterns, shapes: getUniqueShapes(patterns)};
}

type GroupBy = 'symmetry' | null;
type SortBy = 'complexity';

const useOnOpen = (onOpen: (open: boolean) => void) => {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current!;
        let t: NodeJS.Timeout;
        const observer = new MutationObserver(() => {
            clearTimeout(t);
            if (dialog.hasAttribute('open')) {
                onOpen(true);
            } else {
                console.log('setting a timeout');
                t = setTimeout(() => onOpen(false), 300);
            }
        });
        observer.observe(dialog, {attributes: true, attributeFilter: ['open']});

        return () => observer.disconnect();
    }, [onOpen]);
    return ref;
};

export const Gallery = ({loaderData}: Route.ComponentProps) => {
    const [showDialog, setShowDialog] = useState(false);
    const dialogRef = useOnOpen(setShowDialog);
    const search = useSearchParams();

    const [groupBy, setGroupBy] = useState<GroupBy>('symmetry');
    const [sortBy, setSortBy] = useState<{by: SortBy; down: boolean}>({
        by: 'complexity',
        down: true,
    });

    const patternsByHash: Record<
        string,
        {hash: string; tiling: Tiling; data: ReturnType<typeof getPatternData>}
    > = {};
    loaderData.patterns.forEach((pattern) => (patternsByHash[pattern.hash] = pattern));
    const groups: Record<string, string[]> = {};
    if (groupBy === 'symmetry') {
        Object.entries(patternsByHash).forEach(
            ([
                hash,
                {
                    tiling: {shape},
                },
            ]) => {
                const key = shapeKey(shape);
                if (!groups[key]) {
                    groups[key] = [hash];
                } else {
                    groups[key].push(hash);
                }
            },
        );
    } else {
        groups['All'] = Object.keys(patternsByHash);
    }

    Object.values(groups).forEach((patterns) =>
        patterns.sort(
            (a, b) =>
                patternsByHash[sortBy.down ? b : a].tiling.cache.segments.length -
                patternsByHash[sortBy.down ? a : b].tiling.cache.segments.length,
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
                <button
                    className="btn btn-sm btn-accent"
                    onClick={() => dialogRef.current?.showModal()}
                >
                    Filter by shape
                </button>
            </div>
            <dialog id="filter-modal" className="modal" ref={dialogRef}>
                <div className="modal-box flex flex-col w-11/12 max-w-5xl">
                    <h3 className="font-bold text-lg">Filter by shape</h3>
                    {showDialog ? <ShapeDialog data={loaderData} /> : null}
                    <div className="modal-action">
                        <form method="dialog">
                            {/* if there is a button in form, it will close the modal */}
                            <button className="btn">Close</button>
                        </form>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
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
                                {groups[key].map((id) => (
                                    <div key={id}>
                                        <a href={`/gallery/pattern/${id}`}>
                                            <ShowTiling
                                                tiling={patternsByHash[id].tiling}
                                                hash={id}
                                                size={200}
                                                data={patternsByHash[id].data}
                                            />
                                        </a>
                                    </div>
                                ))}
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
