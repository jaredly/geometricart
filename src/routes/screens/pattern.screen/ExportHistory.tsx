import {History} from '../../../json-diff/history';
import {makeHistoryContext} from '../../../json-diff/react';
import {State} from './export-types';

type ExportAnnotation = {type: 'img'; url: string} | {type: 'video'; url: string};
export type ExportHistory = History<State, ExportAnnotation>;

export const [ProvideExportState, useExportState] = makeHistoryContext<State, ExportAnnotation>(
    'type',
);
