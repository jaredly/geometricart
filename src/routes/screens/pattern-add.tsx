import {useMemo, useState} from 'react';
import {useDropStateTarget} from '../../editor/useDropTarget';
import {State, Tiling} from '../../types';
import {getNewPatternData, getPatternData} from '../getPatternData';
import type {Route} from './+types/pattern-add';
import {PatternView} from './pattern.screen/pattern-view';
import {randomUUIDv7} from 'bun';
import {savePattern} from '../db.server';
import {useFetcher} from 'react-router';

export async function action({request, params}: Route.ActionArgs) {
    const data = await request.formData();
    const {tiling}: {tiling: Tiling} = JSON.parse(data.get('state') as string);
    if (!tiling.cache.hash) throw new Error(`tiling has no hash`);
    const uuid = randomUUIDv7();
    savePattern(uuid, tiling);
    return uuid;
}

export default function PatternAddScreen() {
    const [state, setState] = useState(null as null | State);
    const [dragging, callbacks] = useDropStateTarget(setState);

    const tiling = state ? Object.values(state.tilings)[0] : null;

    const data = useMemo(() => (tiling ? getNewPatternData(tiling) : null), [tiling]);
    const fetcher = useFetcher();

    if (!state) {
        return (
            <div
                {...callbacks}
                className={
                    'w-full h-dvh flex items-center justify-center' +
                    (dragging ? ' bg-amber-700' : '')
                }
            >
                <h1>Drop an image to add the embedded pattern</h1>
            </div>
        );
    }

    if (!tiling || !data) {
        return (
            <div {...callbacks}>
                <h1>That didn't have a tiling. Try again?</h1>
            </div>
        );
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
                        <li>
                            <button
                                className="btn"
                                onClick={() => {
                                    fetcher
                                        .submit({state: JSON.stringify({tiling})}, {method: 'POST'})
                                        .then((value) => {
                                            console.log('got', value);
                                        });
                                }}
                            >
                                Save New Pattern
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <PatternView
                loaderData={{
                    similar: [],
                    pattern: {tiling, hash: tiling.cache.hash, imageDrawings: {}, images: []},
                }}
            />
        </div>
    );
}
