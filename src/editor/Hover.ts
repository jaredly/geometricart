import {Id, Selection} from '../types';

export type Hover =
    | {
          type: 'element';
          kind: Selection['type'] | 'Clip' | 'Tiling';
          id: Id;
      }
    | {type: 'guides'; ids?: string[]};
