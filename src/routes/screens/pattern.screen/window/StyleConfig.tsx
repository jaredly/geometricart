import {useValue} from '../../../../json-diff/react';
import {useExportState} from '../ExportHistory';
import {parseAnimatable} from '../state-editor/createLayerTemplate';
import {PaletteEditor} from '../state-editor/PaletteEditor';
import {TextField} from '../state-editor/TextField';

export const StyleConfig = () => {
    const ctx = useExportState();
    const styleConfig = useValue(ctx.$.styleConfig);

    return (
        <div className="space-y-3">
            <TextField
                label="Seed"
                value={String(styleConfig.seed)}
                onChange={(seed) => ctx.$.styleConfig.seed(parseAnimatable(seed))}
            />
            <PaletteEditor palette={styleConfig.palette} update={ctx.$.styleConfig.palette} />
        </div>
    );
};
