import {useRef} from 'react';
import {Coord} from '../../../types';
import {makeContext} from './diffStateManager';
import {Hover} from './resolveMods';
import {DiffBuilderA} from '../../../json-diff/helper2';

export const useLatest = <T,>(v: T) => {
    const l = useRef(v);
    l.current = v;
    return l;
};

export const [ProvideEditState, useEditState] = makeContext<EditState>({
    hover: null,
    showShapes: false,
    pending: null,
});

export type EditStateUpdate = DiffBuilderA<EditState, 'type'>;

export type EditState = {
    showShapes: boolean;
    hover: null | Hover;
    pending:
        | {type: 'shape'; points: Coord[]; onDone(points: Coord[], open: boolean): void}
        | {type: 'dup-shape'; id: string; onDone(point: Coord): void}
        | {type: 'select-shapes'; key: string; shapes: string[]; onDone(shapes: string[]): void}
        | null;
};
