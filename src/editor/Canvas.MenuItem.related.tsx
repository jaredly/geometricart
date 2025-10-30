import React from 'react';
import {DrawPathState} from './DrawPath';
import {Coord, View} from '../types';

export type MenuItem = {
    label: React.ReactNode;
    icon?: string;
    command?: (event: {originalEvent: React.MouseEvent; item: MenuItem}) => void;
    items?: MenuItem[];
};

export type SelectMode = boolean | 'radius' | 'path';

export type DrawShapeState = {
    type: 'shape';
    points: Coord[];
    // that's it, right?
    // the adjacency matrix gets just memoized, right?
};

export type EditorState = {
    tmpView: null | View;
    items: Array<MenuItem>;
    zooming: boolean;

    // mouse pos
    pos: Coord;
    dragPos: null | {view: View; coord: Coord};

    dragSelectPos: null | Coord;
    selectMode: SelectMode;
    multiSelect: boolean;
    pending:
        | null
        | {type: 'waiting'}
        | DrawPathState
        | DrawShapeState
        | {
              type: 'tiling';
              points: Coord[];
          };
};