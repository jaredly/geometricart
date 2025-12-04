import React, {useMemo} from 'react';

export const SubStyleList = <T,>({
    label,
    emptyLabel,
    items,
    createItem,
    render,
    onChange,
}: {
    label: string;
    emptyLabel: string;
    items: Record<string, T>;
    createItem: (id: string) => T;
    render: (
        key: string,
        value: T,
        update: (next: T, nextKey?: string) => void,
        remove: () => void,
    ) => React.ReactNode;
    onChange: (next: Record<string, T>) => void;
}) => {
    const entries = useMemo(() => Object.entries(items), [items]);

    const upsert = (key: string, value: T, nextKey?: string) => {
        const record = {...items};
        delete record[key];
        record[nextKey ?? key] = value;
        onChange(record);
    };

    return (
        <div className="bg-base-100 rounded-lg space-y-2">
            <div className="flex items-center justify-between px-3">
                <div className="font-semibold text-sm">{label}</div>
                <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                        const id = `${label.toLowerCase()}-${entries.length + 1}`;
                        upsert(id, createItem(id));
                    }}
                >
                    Add
                </button>
            </div>
            {entries.length === 0 ? <div className="text-xs opacity-60">{emptyLabel}</div> : null}
            <div className="space-y-2">
                {entries.map(([key, value]) => (
                    <div key={key} className="rounded border border-base-300 p-2">
                        {render(
                            key,
                            value,
                            (next, nextKey) => upsert(key, next, nextKey),
                            () => {
                                const record = {...items};
                                delete record[key];
                                onChange(record);
                            },
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
