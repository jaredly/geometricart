import {History} from '../../../../json-diff/history';
import {BarePath, Coord} from '../../../../types';
import {Crop, AnimatableColor, Box, AnimatableNumber, Color, EntityRoot} from '../export-types';
import {ExportAnnotation} from '../ExportHistory';

export type ExportHistory = History<State, ExportAnnotation>;

type Coord3 = {x: number; y: number; z: number};

export type ExportConfig2d = {
    type: '2d';
    box: Box;
    scale: number; // pixels per unit; box.width * scale = pixels
};

export type ExportConfig =
    | ExportConfig2d
    | {
          type: '3d';
          location: Coord3;
          lookingAt: Coord3;
          size: Coord;
          scale: number;
      };

export type State = EntityRoot & {
    version: 1;
    // multiply = a pattern id in a layer.
    // that's used to determine the dooblydoo.
    shapes: Record<string, BarePath & {multiply?: string}>;
    crops: Record<string, Crop>;
    view: {
        ppu: number;
        background?: AnimatableColor;
        center: Coord;
    };
    exports: Record<string, {id: string; name?: string; config: ExportConfig}>;
    styleConfig: {
        seed: AnimatableNumber;
        palette: Color[];
        timeline: {
            // 0 to 1, sorted
            ts: number[];
            lanes: {
                name: string;
                // sorted orders
                ys: number[];
                // index into ys
                // one number per `t` in `ts`
                values: number[];
                // easings
                easings: (string | null)[];
            }[];
        };
    };
};
