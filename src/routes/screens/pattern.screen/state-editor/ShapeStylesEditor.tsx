import React, {useMemo, useState} from 'react';
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
    const onMove = (prev: number, next: number) => {
        if (prev === next) return;

        const items = entries.slice();
        const [got] = items.splice(prev, 1);

        // const orders: number[] = keys.map(key => styles[key].order)
        // for (let i=1; i<orders.length; i++) {
        //     const prev = orders
        // }
        // keys.forEach(key => {
        //     const order = styles[key].order
        //     if (orders.length && orders[orders.length - 1] > order) {
        //         const biffer = orders.findIndex(o => o > order)
        //     }
        // })
    };

    const upsert = (key: string, style: ShapeStyle) => {
        const record = {...styles};
        record[key] = style;
        onChange(record);
    };

    return (
        <div className="bg-base-200 rounded-lg border border-base-300 space-y-3">
            <div className="flex items-center justify-between p-3">
                <div className="font-semibold">Shape Styles</div>
                <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                        const id = `style-${entries.length + 1}`;
                        upsert(id, createShapeStyle(id));
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
                        node: (
                            <ShapeStyleCard
                                key={key + ':' + i}
                                palette={palette}
                                value={style}
                                onChange={(next) => upsert(key, next)}
                                onRemove={() => {
                                    const record = {...styles};
                                    delete record[key];
                                    onChange(record);
                                }}
                            />
                        ),
                    }))}
                    onReorder={(prev, next) => {
                        console.log('pn', prev, next);
                    }}
                />
            </div>
        </div>
    );
};
