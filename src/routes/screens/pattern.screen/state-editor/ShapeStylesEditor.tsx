import {useMemo} from 'react';
import {Color, ShapeKind, ShapeStyle} from '../export-types';
import {ShapeStyleCard} from './ShapeStyleCard';
import {createShapeStyle} from './createLayerTemplate';
import {DragToReorderList} from './DragToReorderList';
import {Updater} from '../../../../json-diff/Updater';
import {BaseKindEditor} from './BaseKindEditor';

export const ShapeStylesEditor = ({
    styles,
    update,
    palette,
}: {
    palette: Color[];
    styles: Record<string, ShapeStyle<ShapeKind>>;
    update: Updater<Record<string, ShapeStyle<ShapeKind>>>;
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
                        update[id].add(style);
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
                            <ShapeStyleCard<ShapeKind>
                                handleProps={handleProps}
                                key={key + ':' + i}
                                palette={palette}
                                value={style}
                                update={update[key]}
                                onRemove={update[key].remove}
                                KindEditor={BaseKindEditor}
                                defaultValue={{type: 'everything'}}
                            />
                        ),
                    }))}
                    onReorder={(prev, next) => {
                        const id = entries[prev][0];
                        update[id].order(nextOrder(prev, next, entries));
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
