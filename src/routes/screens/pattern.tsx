import {useLoaderData, useParams} from 'react-router';
import {getCachedPatternData, getPattern, getSimilarPatterns} from '../db.server';
import type {Route} from './+types/pattern';
// import {Pattern} from './pattern.screen/pattern-view';
import {useState} from 'react';
import {PatternView} from './pattern.screen/pattern-view';
import {PatternInspect} from './pattern.screen/pattern-inspect';

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

export default function PatternScreen() {
    const {id} = useParams();
    let loaderData = useLoaderData<typeof loader>();
    const hasConstruct = false; // todo get from loaderData
    const tabs = [
        {name: 'View'},
        {name: 'Inspect'},
        {name: 'Export'},
        {name: 'Tutorial', enabled: hasConstruct},
    ];

    const [currentTab, setCurrentTab] = useState('Inspect');

    if (!id || !loaderData) {
        return <div>No data... {id}</div>;
    }

    return (
        <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
            <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 flex justify-between">
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li>
                            <a href="/">Geometric Art</a>
                        </li>
                        <li>
                            <a href="/gallery/">Gallery</a>
                        </li>
                        <li>Pattern {id}</li>
                    </ul>
                </div>
                <div role="tablist" className="tabs tabs-border">
                    {tabs.map((tap) =>
                        tap.enabled !== false ? (
                            <a
                                role="tab"
                                key={tap.name}
                                className={'tab' + (currentTab === tap.name ? ` tab-active` : '')}
                                onClick={() => {
                                    setCurrentTab(tap.name);
                                }}
                            >
                                {tap.name}
                            </a>
                        ) : null,
                    )}
                </div>
            </div>
            {currentTab === 'Inspect' ? (
                <PatternInspect tiling={loaderData.pattern.tiling} />
            ) : (
                <PatternView loaderData={loaderData} />
            )}
        </div>
    );
}
