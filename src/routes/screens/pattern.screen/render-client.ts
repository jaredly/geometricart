import {useCallback, useEffect, useRef} from 'react';
import {MessageResponse, MessageToWorker} from './render-worker';

export type WorkerSend = (data: MessageToWorker, f: (v: MessageResponse) => void) => void;

export const useWorker = () => {
    const worker = useRef(
        null as null | {
            worker: Worker;
            inflight: Record<string, (res: MessageResponse) => void>;
        },
    );
    useEffect(() => {
        if (!worker.current) {
            worker.current = {
                worker: new Worker(new URL('./render-worker.ts', import.meta.url), {
                    type: 'module',
                }),
                inflight: {},
            };
        }

        const fn = (evt: MessageEvent<MessageResponse>) => {
            if (!worker.current) return;
            worker.current.inflight[evt.data.id](evt.data);
        };

        worker.current.worker.onerror = (err) => {
            console.log('ERRR', err);
        };
        worker.current.worker.addEventListener('message', fn);
        return () => worker.current?.worker.removeEventListener('message', fn);
    }, []);
    return useCallback((data: MessageToWorker, f: (v: MessageResponse) => void) => {
        if (!worker.current) return;
        const id = Math.random().toString(36).slice(2);
        worker.current.inflight[id] = (res) => {
            if (worker.current) {
                delete worker.current.inflight[id];
            }
            f(res);
        };
        worker.current.worker.postMessage({...data, id});
    }, []);
};
