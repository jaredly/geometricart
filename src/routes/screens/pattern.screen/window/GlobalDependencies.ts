import {createContext, useContext} from 'react';
import {WorkerSend} from '../render/render-client';
import {SnapshotUrl} from '../state-editor/saveAnnotation';

export type GlobalDependencies = {
    worker: WorkerSend;
    snapshotUrl: SnapshotUrl;
};

export const GlobalDependenciesCtx = createContext<GlobalDependencies>(null as any);
export const useGlobalDependencies = () => {
    return useContext(GlobalDependenciesCtx);
};
