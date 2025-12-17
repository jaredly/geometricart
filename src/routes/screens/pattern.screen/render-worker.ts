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
          bg: Color;
      }
    | {
          type: 'status';
          progress: number;
      };

const animCache = new Map();
const cropCache = new Map<string, {path: PKPath; crop: Crop; t?: number}>();

self.onmessage = (evt: MessageEvent<MessageToWorker & {id: string}>) => {
    switch (evt.data.type) {
        case 'frame': {
            const {state, patterns, t} = evt.data;
            cacheCrops(state.crops, state.shapes, cropCache, t, animCache);

            const {items, bg} = svgItems(state, animCache, cropCache, patterns, t);

            const msg: MessageResponse = {type: 'frame', items, bg, id: evt.data.id};
            return postMessage(msg);
        }
        case 'video':
        case 'animate':
            throw new Error('not yet');
    }
};
