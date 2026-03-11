import {useValue} from '../../../../json-diff/react';
import {useExportState} from '../ExportHistory';
import {ExportView} from './ExportView';

export const Exports = () => {
    const ctx = useExportState();
    const exports = useValue(ctx.$.exports);

    return (
        <div className="p-4 flex flex-col gap-8">
            {Object.entries(exports).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-4">
                    <ExportView path={ctx.$.exports[key]} />
                </div>
            ))}
        </div>
    );
};
