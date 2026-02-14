import {IconDelete} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {useExportState} from '../ExportHistory';
import {BlurInput} from '../state-editor/BlurInput';
import {ExportView} from './ExportView';

export const Exports = () => {
    const ctx = useExportState();
    const exports = useValue(ctx.$.exports);

    return (
        <div className="p-4 flex flex-col gap-8">
            {Object.entries(exports).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-4">
                    <div className="flex items-center">
                        <label>
                            Name
                            <BlurInput
                                className="w-20 ml-4"
                                value={value.name ?? ''}
                                onChange={(name) =>
                                    ctx.$.exports[key].name(name === '' ? undefined : name)
                                }
                            />
                        </label>
                        <button
                            className="btn ml-4 text-error"
                            onClick={() => {
                                ctx.$.exports[key].$remove();
                            }}
                        >
                            <IconDelete />
                        </button>
                    </div>
                    <ExportView path={ctx.$.exports[key]} />
                </div>
            ))}
        </div>
    );
};
