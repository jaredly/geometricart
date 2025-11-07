import {useMemo, useState} from 'react';
import {useDropStateTarget} from '../../editor/useDropTarget';
import {State, Tiling} from '../../types';
import {getPatternData} from '../getPatternData';
import type {Route} from './+types/pattern-add';
import {Pattern} from './pattern';
import {randomUUIDv7} from 'bun';
import {savePattern} from '../db.server';

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

    const data = useMemo(() => (tiling ? getPatternData(tiling) : null), [tiling]);

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
        <Pattern
            loaderData={{
                data: data,
                similar: [],
                pattern: {tiling, hash: tiling.cache.hash, imageDrawings: {new: state}, images: []},
            }}
        />
    );
}
