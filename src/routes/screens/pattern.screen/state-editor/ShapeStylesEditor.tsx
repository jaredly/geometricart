import {useMemo} from 'react';
import {Color, ShapeStyle} from '../export-types';
import {ShapeStyleCard} from './ShapeStyleCard';
import {createShapeStyle} from './createLayerTemplate';
import {DragToReorderList} from './DragToReorderList';

export const ShapeStylesEditor = ({
    styles,
    onChange,
    palette,
}: {
    palette: Color[];
    styles: Record<string, ShapeStyle>;
    onChange: (next: Record<string, ShapeStyle>) => void;
}) => {
    const entries = useMemo(
        () => Object.entries(styles).sort(([, a], [, b]) => a.order - b.order),
        [styles],
    );

    return (
        <div className="bg-base-200 rounded-lg border border-base-300 space-y-3">
            <div className="flex items-center justify-between p-3">
                <div className="font-semibold">Shape Styles</div>
                <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                        const id = `style-${entries.length + 1}`;
                        const style = createShapeStyle(id);
                        // Object.values(styles).forEach((s) => {
                        //     Object.keys(s.fills).forEach((k) => {
                        //         style.fills[k] = {id: k, mods: []};
                        //     });
                        //     Object.keys(s.lines).forEach((k) => {
                        //         style.lines[k] = {id: k, mods: []};
                        //     });
                        // });
                        onChange({...styles, [id]: style});
                    }}
                >
                    Add style
                </button>
            </div>
            {entries.length === 0 ? <div className="text-sm opacity-60">No styles yet.</div> : null}
            <div className="space-y-3">
                <DragToReorderList
                    items={entries.map(([key, style], i) => ({
                        key,
                        render: (handleProps) => (
                            <ShapeStyleCard
                                handleProps={handleProps}
                                key={key + ':' + i}
                                palette={palette}
                                value={style}
                                onChange={(next) => onChange({...styles, [key]: next})}
                                onRemove={() => {
                                    const record = {...styles};
                                    delete record[key];
                                    onChange(record);
                                }}
                            />
                        ),
                    }))}
                    onReorder={(prev, next) => {
                        const id = entries[prev][0];
                        onChange({
                            ...styles,
                            [id]: {...styles[id], order: nextOrder(prev, next, entries)},
                        });
                    }}
                />
            </div>
        </div>
    );
};

const nextOrder = (prev: number, next: number, entries: [string, {order: number}][]) => {
    if (next === 0) {
        return entries[0][1].order - 10;
    }
    if (next >= entries.length - 1) {
        return entries[entries.length - 1][1].order + 10;
    }
    const [left, right] = prev < next ? [next, next + 1] : [next - 1, next];
    return (entries[left][1].order + entries[right][1].order) / 2;
};
