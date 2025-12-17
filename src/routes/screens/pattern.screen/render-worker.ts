import {Coord} from '../../../types';
import {PKPath} from '../../pk';
import {cacheCrops} from './cacheCrops';
import {Patterns, RenderItem} from './evaluate';
import {Box, Color, Crop, State} from './export-types';
import {recordVideo} from './recordVideo';
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
          size: number;
          duration: number;
          box: Box;
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
    | {type: 'video'; id: string; url?: string}
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
            case 'video': {
                recordVideo(
                    evt.data.state,
                    evt.data.size,
                    evt.data.box,
                    evt.data.patterns,
                    evt.data.duration,
                    (progress) => postMessage({type: 'status', progress, id: evt.data.id}),
                    cropCache,
                ).then((url) => postMessage({type: 'video', id: evt.data.id, url}));
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
