import {Coord} from '../../../../types';
import {PKPath} from '../../../pk';
import {cacheCrops} from '../utils/cacheCrops';
import {RenderItem} from '../eval/evaluate';
import {Box, Color, Crop} from '../export-types';
import {State} from '../types/state-type';
import {recordVideo} from './recordVideo';
import {svgItems} from './svgItems';
import {runPNGExport} from './runPNGExport';

export type MessageToWorker =
    | {
          type: 'frame';
          state: State;
          t: number;
      }
    | {type: 'snapshot'; state: State}
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
    | {type: 'snapshot'; blob: Blob; ext: 'mp4' | 'png'; id: string}
    | {
          type: 'status';
          progress: number;
          id: string;
      }
    | {type: 'error'; id: string; error: string};

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
                ).then(
                    (blob) =>
                        post({
                            type: 'video',
                            id: evt.data.id,
                            url: blob ? URL.createObjectURL(blob) : undefined,
                        }),
                    (err) => {
                        console.error(err);
                        console.log('Failed', evt.data.id);
                        post({
                            type: 'error',
                            id: evt.data.id,
                            error: err instanceof Error ? err.message : err + '',
                        });
                    },
                );
                return;
            }
            case 'snapshot': {
                const {state} = evt.data;
                const allAccessed = cacheCrops(state.crops, state.shapes, cropCache, 0, animCache);

                const {items, bg, byKey, warnings, keyPoints} = svgItems(
                    state,
                    animCache,
                    cropCache,
                    0,
                    false,
                    allAccessed,
                );
                const video = allAccessed.has('t');
                console.log('all items accessed', [...allAccessed.keys()]);

                const blob = video
                    ? recordVideo(state, 200, state.view.box, 1, () => {}, cropCache, 6)
                    : new Promise<Blob>((res) => {
                          res(runPNGExport(200, state.view.box, items, bg));
                      });

                blob.then(
                    (blob) =>
                        post({type: 'snapshot', ext: video ? 'mp4' : 'png', id: evt.data.id, blob}),
                    (err) => {
                        console.error(err);
                        console.log('Failed', evt.data.id);

                        post({
                            type: 'error',
                            id: evt.data.id,
                            error: err instanceof Error ? err.message : err + '',
                        });
                    },
                );

                return;
            }
            case 'animate':
                throw new Error('not yet');
        }
    } catch (err) {
        console.error(err);
        console.log('Failed', evt.data.id);
        post({
            type: 'error',
            id: evt.data.id,
            error: err instanceof Error ? err.message : err + '',
        });
        return;
    }
};

postMessage({type: 'hello'});
