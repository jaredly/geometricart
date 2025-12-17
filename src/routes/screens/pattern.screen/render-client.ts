import {useCallback, useEffect, useRef} from 'react';
import {MessageResponse, MessageToWorker} from './render-worker';

export type WorkerSend = (data: MessageToWorker, f: (v: MessageResponse) => void) => void;

type WRef = {
    worker: null | Worker;
    inflight: Record<string, (res: MessageResponse) => void>;
    waiting: {data: MessageToWorker; f: (v: MessageResponse) => void}[];
};

export const useWorker = () => {
    const worker = useRef<WRef>({worker: null, inflight: {}, waiting: []});
    useEffect(() => {
        worker.current.worker = new Worker(new URL('./render-worker.ts', import.meta.url), {
            type: 'module',
        });

        const fn = (evt: MessageEvent<MessageResponse | {type: 'hello'}>) => {
            console.log('got evt', evt.data);
            if (evt.data.type === 'hello') {
                const waiting = worker.current.waiting;
                console.log('sending waiting', waiting.length);
                worker.current.waiting = [];
                waiting.forEach(({data, f}) => {
                    enqueue(worker.current, f, data);
                });
                return;
            }
            worker.current.inflight[evt.data.id](evt.data);
        };

        worker.current.worker.onerror = (err) => {
            console.log('ERRR', err);
        };
        worker.current.worker.addEventListener('message', fn);
        return () => worker.current.worker?.removeEventListener('message', fn);
    }, []);
    return useCallback((data: MessageToWorker, f: (v: MessageResponse) => void) => {
        console.log('pls', data, f);
        if (!worker.current.worker) {
            console.log('waiting...');
            worker.current.waiting.push({data, f});
            return;
        }

        enqueue(worker.current, f, data);
    }, []);
};

function enqueue(worker: WRef, f: (v: MessageResponse) => void, data: MessageToWorker) {
    if (!worker.worker) return;
    const id = Math.random().toString(36).slice(2);
    worker.inflight[id] = (res) => {
        delete worker.inflight[id];
        f(res);
    };
    console.log('send to worker', id);
    worker.worker.postMessage({...data, id});
}
