import {Coord} from '../../../types';
import {makeContext} from './diffStateManager';
import {Hover} from './resolveMods';

export const [ProvideEditState, useEditState] = makeContext<EditState>({
    hover: null,
    showShapes: false,
    pending: null,
});

export type EditState = {
    showShapes: boolean;
    hover: null | Hover;
    pending:
        | {type: 'shape'; points: Coord[]; onDone(points: Coord[], open: boolean): void}
        | {type: 'dup-shape'; id: string; onDone(point: Coord): void}
        | null;
};
