import {Coord} from '../../../types';
import {PKPath} from '../../pk';
import {cacheCrops} from './cacheCrops';
import {Patterns, RenderItem} from './evaluate';
import {Color, Crop, State} from './export-types';
import {svgItems} from './resolveMods';

export type MessageToWorker =
    | {
          type: 'frame';
          state: State;
          patterns: Patterns;
          t: number;
      }
    | {
          type: 'video';
          state: State;
          patterns: Patterns;
      }
    | {
          type: 'animate';
          canvas: OffscreenCanvas;
          state: State;
          patterns: Patterns;
      };

export type MessageResponse =
    | {
          id: string;
          type: 'frame';
          items: RenderItem[];
          byKey: Record<string, string[]>;
          warnings: string[];
          keyPoints: [Coord, Coord][];
          bg: Color;
      }
    | {
          type: 'status';
          progress: number;
          id: string;
      };

const animCache = new Map();
const cropCache = new Map<string, {path: PKPath; crop: Crop; t?: number}>();

self.onmessage = (evt: MessageEvent<MessageToWorker & {id: string}>) => {
    try {
        switch (evt.data.type) {
            case 'frame': {
                const {state, patterns, t} = evt.data;
                cacheCrops(state.crops, state.shapes, cropCache, t, animCache);

                const {items, bg, byKey, warnings, keyPoints} = svgItems(
                    state,
                    animCache,
                    cropCache,
                    patterns,
                    t,
                );

                const msg: MessageResponse = {
                    type: 'frame',
                    items,
                    keyPoints,
                    bg,
                    id: evt.data.id,
                    byKey,
                    warnings,
                };
                return postMessage(msg);
            }
            case 'video':
            case 'animate':
                throw new Error('not yet');
        }
    } catch (err) {
        console.error(err);
        console.log('Failed', evt.data.id);
    }
};

postMessage({type: 'hello'});
