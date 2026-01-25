import {useMemo} from 'react';
import {Color, ShapeKind, ShapeStyle} from '../export-types';
import {ShapeStyleCard} from './ShapeStyleCard';
import {createShapeStyle} from './createLayerTemplate';
import {DragToReorderList} from './DragToReorderList';
import {Updater} from '../../../../json-diff/Updater';
import {ShapeKindEditor} from './BaseKindEditor';

export const ShapeStylesEditor = <Kind,>({
    styles,
    update,
    palette,
    KindEditor,
    defaultKind,
}: {
    palette: Color[];
    styles: Record<string, ShapeStyle<Kind>>;
    update: Updater<Record<string, ShapeStyle<Kind>>>;
    KindEditor: React.ComponentType<{value: Kind; update: Updater<Kind>}>;
    defaultKind: Kind;
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
                        let i = 0;
                        for (let i = 0; i < 100; i++) {
                            const id = `style-${i}`;
                            if (!styles[id]) {
                                const style = createShapeStyle(id, defaultKind);
                                update[id].add(style);
                                return;
                            }
                        }
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
                            <ShapeStyleCard<Kind>
                                handleProps={handleProps}
                                key={key + ':' + i}
                                palette={palette}
                                value={style}
                                update={update[key]}
                                onRemove={update[key].remove}
                                KindEditor={KindEditor}
                                defaultValue={defaultKind}
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
