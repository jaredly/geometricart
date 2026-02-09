import {createContext} from 'react';
import {WorkerSend} from '../render/render-client';
import {SnapshotUrl} from '../state-editor/saveAnnotation';

export type GlobalDependencies = {
    worker: WorkerSend;
    snapshotUrl: SnapshotUrl;
};

export const GlobalDependenciesCtx = createContext<GlobalDependencies>(null as any);
