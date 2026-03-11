import {diffBuilderApply, PendingJsonPatchOp} from '../../../json-diff/helper2';
import {History} from '../../../json-diff/history';
import {makeHistoryContext} from '../../../json-diff/react';
import {State} from './types/state-type';

export type ExportAnnotation = {type: 'img'; id: string} | {type: 'video'; id: string};
export type ExportHistory = History<State, ExportAnnotation>;

export const [ProvideExportState, useExportState] = makeHistoryContext<State, ExportAnnotation>(
    'type',
);

export const exportStatePath = diffBuilderApply<
    State,
    null,
    'type',
    PendingJsonPatchOp<State, 'type', null>
>((v) => v, null, 'type');
