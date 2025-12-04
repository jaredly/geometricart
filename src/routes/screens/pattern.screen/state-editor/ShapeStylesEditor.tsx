import React, {useMemo} from 'react';
import {Color, ShapeStyle} from '../export-types';
import {ShapeStyleCard} from './ShapeStyleCard';
import {createShapeStyle} from './createLayerTemplate';

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

    const upsert = (key: string, style: ShapeStyle, nextKey?: string) => {
        const record = {...styles};
        delete record[key];
        record[nextKey ?? key] = style;
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
                {entries.map(([key, style], i) => (
                    <ShapeStyleCard
                        key={key + ':' + i}
                        palette={palette}
                        value={style}
                        onChange={(next, nextKey) => upsert(key, next, nextKey)}
                        onRemove={() => {
                            const record = {...styles};
                            delete record[key];
                            onChange(record);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
