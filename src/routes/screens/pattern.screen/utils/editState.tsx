import {useRef} from 'react';
import {BarePath, Coord} from '../../../../types';
// import {makeContext} from './diffStateManager';
import {Hover} from './resolveMods';
import {DiffBuilderA} from '../../../../json-diff/helper2';
import {makeContext, makeHistoryContext} from '../../../../json-diff/react';

export const useLatest = <T,>(v: T) => {
    const l = useRef(v);
    l.current = v;
    return l;
};

export const [ProvideEditState, useEditState] = makeContext<EditState>('type');
export const [ProvidePendingState, usePendingState] = makeHistoryContext<PendingState, unknown>(
    'type',
);

export type EditStateUpdate = DiffBuilderA<EditState, 'type'>;
export type PendingStateUpdate = DiffBuilderA<PendingState, 'type'>;

export type PendingState = {
    pending:
        | {
              type: 'shape';
              points: Coord[];
              onDone(points: Coord[], open: boolean): void;
              asShape?: (pts: Coord[]) => BarePath;
          }
        | {type: 'dup-shape'; id: string; onDone(point: Coord): void}
        | {type: 'select-shapes'; key: string; shapes: string[]; onDone(shapes: string[]): void}
        | {type: 'select-shape'; onDone(shape: string): void}
        | null;
};

export type EditState = {
    showShapes: boolean;
    hover: null | Hover;
};
