import {useLoaderData, useParams} from 'react-router';
import {getCachedPatternData, getPattern, getSimilarPatterns} from '../db.server';
import type {Route} from './+types/pattern';
// import {Pattern} from './pattern.screen/pattern-view';
import {useEffect, useState} from 'react';
import {Pattern} from './pattern.screen/pattern-view';

export async function loader({params}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    // return null;
    const pattern = getPattern(params.id);
    if (!pattern) return null;
    const data = getCachedPatternData(pattern.hash, pattern.tiling);
    return {pattern, similar: getSimilarPatterns(pattern.hash, data)};
}

// const usePromise = <T,>(t: () => Promise<T>) => {
//     const [value, setValue] = useState(null as null | T);
//     useEffect(() => {
//         t().then(setValue);
//     }, []);
//     return value;
// };

export default function PatternScreen() {
    const {id} = useParams();
    let loaderData = useLoaderData<typeof loader>();
    // const Component = usePromise(() => import('./pattern.screen/pattern-view'));

    if (!id || !loaderData) {
        return <div>No data... {id}</div>;
    }

    return <Pattern loaderData={loaderData} id={id} />;
}
