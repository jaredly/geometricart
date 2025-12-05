import {Adjustment, AnimatableValue, Color, Pattern} from '../export-types';
import {CoordField} from './CoordField';
import {NumberField} from './NumberField';
import {PatternContentsEditor} from './PatternContentsEditor';
import {ModsEditor} from './FillEditor';
import {genid} from '../genid';
import {useEditState, useLatest} from '../editState';
import {ChunkEditor} from './ShapeStyleCard';
import {cmp} from './cmp';
import {AnimInput} from './AnimInput';
import {BlurInput} from './BlurInput';

export const PatternEditor = ({
    value,
    onChange,
    palette,
}: {
    palette: Color[];
    value: Pattern;
    onChange: (next: Pattern) => void;
}) => {
    return (
        <div className="space-y-3">
            {typeof value.psize === 'number' ? (
                <NumberField
                    label="Size"
                    value={value.psize}
                    onChange={(v) => onChange({...value, psize: v})}
                />
            ) : (
                <CoordField
                    label="Pattern size"
                    value={value.psize}
                    onChange={(psize) => onChange({...value, psize})}
                />
            )}
            <ModsEditor
                mods={value.mods}
                palette={palette}
                onChange={(mods) => (mods ? onChange({...value, mods}) : undefined)}
            />
            <AdjustmentsEditor
                adjustments={value.adjustments}
                onChange={(adjustments) => onChange({...value, adjustments})}
                palette={palette}
            />
            <PatternContentsEditor
                palette={palette}
                value={value.contents}
                onChange={(contents) => onChange({...value, contents})}
            />
            <SharedEditor
                shared={value.shared}
                onChange={(shared) => onChange({...value, shared})}
            />
        </div>
    );
};

const letters = 'abcdefghijklmnopqrstuvwxyz';

const nextKey = (shared: Record<string, string>) => {
    for (let j = 0; j < 100; j++) {
        for (let i = 0; i < letters.length; i++) {
            const k = `${letters[i]}${j === 0 ? '' : j + 1}`;
            if (!(k in shared)) return k;
        }
    }
};

export const SharedEditor = ({
    shared,
    onChange,
}: {
    shared?: Record<string, AnimatableValue>;
    onChange(v: Record<string, AnimatableValue>): void;
}) => {
    return (
        <div className="border border-base-300 rounded-md p-4 space-y-4">
            <button
                onClick={() => {
                    const nk = nextKey(shared ?? {});
                    if (!nk) return;
                    onChange({...shared, [nk]: '1 + 1'});
                }}
                className="btn btn-sm"
            >
                Add shared value
            </button>
            {Object.entries(shared ?? {})
                .sort((a, b) => cmp(a[0], b[0]))
                .map(([key, value]) => (
                    <div key={key} className="flex flex-row">
                        <BlurInput
                            className="w-10"
                            value={key}
                            placeholder="key"
                            onChange={(nkey) => {
                                if (key === nkey || !nkey) return;
                                const next = {...shared};
                                delete next[key];
                                next[nkey] = value;
                                onChange(next);
                            }}
                        />
                        <BlurInput
                            className="flex-1"
                            value={value}
                            onChange={(value) => onChange({...shared, [key]: value})}
                            placeholder="value"
                        />
                    </div>
                ))}
        </div>
    );
};

const AdjustmentEditor = ({
    adjustment: adj,
    palette,
    onChange,
}: {
    palette: Color[];
    adjustment: Adjustment;
    onChange: (adj: Adjustment) => void;
}) => {
    const edit = useEditState();
    const pending = edit.use((v) => v.pending);
    const isAdding = pending?.type === 'select-shapes' && pending.key === `adj-${adj.id}`;
    const latest = useLatest(adj);
    return (
        <div className="border border-base-300 rounded-md p-4 space-y-4">
            <div className="flex items-center">
                <div className="text-sm bg-base-300 rounded px-2 py-1 mr-4">{adj.id}</div>
                {!adj.shapes.length
                    ? `No shapes selected`
                    : adj.shapes.length === 1
                      ? `1 shape`
                      : `${adj.shapes.length} shapes`}
                <button
                    className="btn btn-sm mx-4"
                    onClick={() => {
                        if (isAdding) {
                            onChange({...adj, shapes: pending.shapes});
                            edit.update.pending.replace(null);
                        } else {
                            edit.update.pending.replace({
                                type: 'select-shapes',
                                key: `adj-${adj.id}`,
                                shapes: adj.shapes,
                                onDone(shapes) {
                                    onChange({...latest.current, shapes});
                                },
                            });
                        }
                    }}
                >
                    {isAdding ? 'Finish' : 'Select shapes'}
                </button>
                <ChunkEditor chunk={adj.t} onChange={(t) => onChange({...adj, t})} />
            </div>
            <SharedEditor shared={adj.shared} onChange={(shared) => onChange({...adj, shared})} />
            <ModsEditor
                mods={adj.mods}
                onChange={(mods) => {
                    onChange({...adj, mods});
                }}
                palette={palette}
            />
        </div>
    );
};
const AdjustmentsEditor = ({
    adjustments,
    onChange,
    palette,
}: {
    palette: Color[];
    adjustments: Pattern['adjustments'];
    onChange: (v: Pattern['adjustments']) => void;
}) => {
    return (
        <div className="space-y-4">
            <div className="font-semibold text-sm flex flex-row gap-4 items-center">
                Adjustments
                <button
                    className="btn btn-sm"
                    value=""
                    onClick={() => {
                        const id = genid();
                        onChange({...adjustments, [id]: {id, mods: [], shapes: []}});
                    }}
                >
                    Add
                </button>
            </div>
            {Object.values(adjustments).map((adj) => (
                <AdjustmentEditor
                    palette={palette}
                    key={adj.id}
                    adjustment={adj}
                    onChange={(adj) => onChange({...adjustments, [adj.id]: adj})}
                />
            ))}
        </div>
    );
};
