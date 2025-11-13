import type {Route} from './+types/animators';
import React from 'react';
import {getAllPatterns, getCachedPatternData, listAnimateds, saveAnimated} from '../db.server';
import {Coord, Tiling} from '../../types';
import {useLocalStorage} from '../../vest/useLocalStorage';
import {useEffect, useMemo, useState} from 'react';
import {shapeD} from '../shapeD';
import {useOnOpen} from '../useOnOpen';
import {coordKey} from '../../rendering/coordKey';
import {plerp} from '../../plerp';
import {tilingTransforms} from '../../editor/tilingTransforms';
import {applyTilingTransformsG, tilingPoints} from '../../editor/tilingPoints';
import {applyMatrices} from '../../rendering/getMirrorTransforms';
import {IconEye, IconEyeInvisible} from '../../icons/Icon';
import {randomUUIDv7} from 'bun';

export async function loader({params}: Route.LoaderArgs) {
    return listAnimateds();
}

export async function action({request, params}: Route.ActionArgs) {
    const id = randomUUIDv7('hex');
    saveAnimated(id, {layers: [], lines: [], crops: [], guides: []});
    return id;
}

export default function Animators({loaderData}: Route.ComponentProps) {
    return (
        <div>
            <h1>Animators</h1>
            {loaderData.map(({id, animated, updated}) => (
                <div key={id}>
                    <a className="link px-4 py-4 block" href={`/animator/${id}`}>
                        {updated}
                    </a>
                </div>
            ))}
            <form method="POST">
                <button>New Animator</button>
            </form>
        </div>
    );
}
