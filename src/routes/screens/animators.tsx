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
        <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
            <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 z-10">
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li>
                            <a href="/">Geometric Art</a>
                        </li>
                        <li>Animator</li>
                    </ul>
                </div>
            </div>
            <div className="gap-4 p-4">
                <h1>Animators</h1>
                {loaderData.map(({id, animated, updated}) => (
                    <div key={id}>
                        <a
                            className="link px-4 py-4 block hover:bg-base-100"
                            href={`/animator/${id}`}
                        >
                            {updated}
                        </a>
                    </div>
                ))}
                <form method="POST">
                    <button className="btn hover:bg-base-100">New Animator</button>
                </form>
            </div>
        </div>
    );
}
