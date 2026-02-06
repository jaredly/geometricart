import {Coord} from '../../../../types';
import {PKPath} from '../../../pk';
import {cacheCrops} from '../utils/cacheCrops';
import {RenderItem} from '../eval/evaluate';
import {Box, Color, Crop} from '../export-types';
import {ExportConfig, State} from '../types/state-type';
import {recordVideo} from './recordVideo';
import {svgItems} from './svgItems';
import {runPNGExport} from './runPNGExport';

export type MessageToWorker =
    | {
          type: 'frame';
          state: State;
          config: ExportConfig;
          t: number;
      }
    | {type: 'snapshot'; state: State; config: ExportConfig}
    | {
          type: 'video';
          config: ExportConfig;
          duration: number;
          state: State;
      }
    | {
          type: 'animate';
          config: ExportConfig;
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
          bg: Color | null;
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
                const {state, t, config} = evt.data;
                if (config.type === '3d') throw new Error('no 3d yet');
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
                const {config} = evt.data;
                if (config.type === '3d') throw new Error('no 3d yet');
                recordVideo(
                    evt.data.state,
                    config.scale,
                    config.box,
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
                const {state, config} = evt.data;
                if (config.type === '3d') throw new Error('no 3d yet');
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
                    ? recordVideo(state, config.scale, config.box, 1, () => {}, cropCache, 6)
                    : new Promise<Blob>((res) => {
                          res(runPNGExport(config.scale, config.box, items, bg));
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
