import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import equal from 'fast-deep-equal';
import {diffBuilderApply} from '../../../json-diff/helper';
import {ops} from '../../../json-diff/ops';
import {Coord} from '../../../types';
import {Hover} from './resolveMods';
import {makeContext} from './diffStateManager';

// type ESM = {
//     current:
// }

const ctx = createContext<EditState>({hover: null, pending: null});

export const [ProvideEditState, useEditState] = makeContext<EditState>({
    hover: null,
    pending: null,
});
export type EditState = {
    hover: null | Hover;
    pending: {type: 'shape'; points: Coord[]; onDone(points: Coord[], open: boolean): void} | null;
};
