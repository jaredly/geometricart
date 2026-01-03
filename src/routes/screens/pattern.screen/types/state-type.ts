import {BarePath} from '../../../../types';
import {Layer, Crop, AnimatableColor, Box, AnimatableNumber, Color} from '../export-types';

export type State = {
    // version: 1;
    // multiply = a pattern id in a layer.
    // that's used to determine the dooblydoo.
    shapes: Record<string, BarePath & {multiply?: string}>;
    layers: Record<string, Layer>;
    crops: Record<string, Crop>;
    view: {
        ppi: number;
        background?: AnimatableColor;
        box: Box;
    };
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
