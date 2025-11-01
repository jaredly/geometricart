import type {Route} from './+types/animators';
import React from 'react';
import {getAllPatterns, getCachedPatternData, listAnimateds} from '../db.server';
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

export async function loader({params}: Route.LoaderArgs) {
    return listAnimateds();
}

export default function Animators({loaderData}: Route.ComponentProps) {
    return (
        <div>
            <h1>Creating an animator y'all</h1>
            {loaderData.map(({id, animated, updated}) => (
                <div key={id}>
                    <a href={`/animator/${id}`}>{updated}</a>
                </div>
            ))}
        </div>
    );
}
