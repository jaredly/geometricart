import {useMemo} from 'react';
import {Color, ShapeKind, ShapeStyle} from '../export-types';
import {ShapeStyleCard} from './ShapeStyleCard';
import {createShapeStyle} from './createLayerTemplate';
import {DragToReorderList} from './DragToReorderList';
import {Updater} from '../../../../json-diff/Updater';
import {nextOrder, orderedItems} from './nextOrder';

export const ShapeStylesEditor = <Kind,>({
    styles,
    update,
    palette,
    KindEditor,
}: {
    palette: Color[];
    styles: Record<string, ShapeStyle<Kind>>;
    update: Updater<Record<string, ShapeStyle<Kind>>>;
    KindEditor: React.ComponentType<{value: Kind; update: Updater<Kind>}>;
}) => {
    const entries = useMemo(() => orderedItems(styles), [styles]);

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
                                const style = createShapeStyle<Kind>(id);
                                update[id].$add(style);
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
                    items={entries.map((style, i) => ({
                        key: style.id,
                        render: (handleProps) => (
                            <ShapeStyleCard<Kind>
                                handleProps={handleProps}
                                key={style.id + ':' + i}
                                palette={palette}
                                value={style}
                                update={update[style.id]}
                                onRemove={update[style.id].$remove}
                                KindEditor={KindEditor}
                            />
                        ),
                    }))}
                    onReorder={(prev, next) => {
                        const id = entries[prev].id;
                        update[id].order.$replace(nextOrder(prev, next, entries));
                    }}
                />
            </div>
        </div>
    );
};
