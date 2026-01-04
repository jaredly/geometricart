import {Coord} from '../../../types';
import {PKPath} from '../../pk';
import {cacheCrops} from './cacheCrops';
import {RenderItem} from './evaluate';
import {Box, Color, Crop} from './export-types';
import {State} from './types/state-type';
import {recordVideo} from './recordVideo';
import {svgItems} from './svgItems';

export type MessageToWorker =
    | {
          type: 'frame';
          state: State;
          t: number;
      }
    | {
          type: 'video';
          size: number;
          duration: number;
          box: Box;
          state: State;
      }
    | {
          type: 'animate';
          canvas: OffscreenCanvas;
          state: State;
      };

export type MessageResponse =
    | {
          id: string;
          type: 'frame';
          items: RenderItem[];
          byKey: Record<string, string[]>;
          warnings: string[];
          keyPoints: ([Coord, Coord] | Coord)[];
          bg: Color;
      }
    | {type: 'video'; id: string; url?: string}
    | {
          type: 'status';
          progress: number;
          id: string;
      };

const animCache = new Map();
const cropCache = new Map<string, {path: PKPath; crop: Crop; t?: number}>();

const post = (msg: MessageResponse) => {
    postMessage(msg);
};

self.onmessage = (evt: MessageEvent<MessageToWorker & {id: string}>) => {
    try {
        switch (evt.data.type) {
            case 'frame': {
                const {state, t} = evt.data;
                cacheCrops(state.crops, state.shapes, cropCache, t, animCache);

                const {items, bg, byKey, warnings, keyPoints} = svgItems(
                    state,
                    animCache,
                    cropCache,
                    t,
                );

                return post({
                    type: 'frame',
                    items,
                    keyPoints,
                    bg,
                    id: evt.data.id,
                    byKey,
                    warnings,
                });
            }
            case 'video': {
                recordVideo(
                    evt.data.state,
                    evt.data.size,
                    evt.data.box,
                    evt.data.duration,
                    (progress) => post({type: 'status', progress, id: evt.data.id}),
                    cropCache,
                ).then((url) => post({type: 'video', id: evt.data.id, url: url ?? undefined}));
                return;
            }
            case 'animate':
                throw new Error('not yet');
        }
    } catch (err) {
        console.error(err);
        console.log('Failed', evt.data.id);
    }
};

postMessage({type: 'hello'});
