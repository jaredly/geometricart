import React, {useMemo} from 'react';
import {Updater} from '../../../../json-diff/helper2';

export const SubStyleList = <T extends {id: string}>({
    label,
    emptyLabel,
    items,
    createItem,
    render,
    update,
}: {
    label: string;
    emptyLabel: string;
    items: Record<string, T>;
    createItem: (id: string) => T;
    render: (
        key: string,
        value: T,
        update: Updater<T>,
        reId: (v: string) => void,
    ) => React.ReactNode;
    update: Updater<Record<string, T>>;
}) => {
    const entries = useMemo(() => Object.entries(items), [items]);

    return (
        <div className="bg-base-100 rounded-lg space-y-2">
            <div className="flex items-center justify-between px-3">
                <div className="font-semibold text-sm">{label}</div>
                <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                        const id = `${label.toLowerCase()}-${entries.length + 1}`;
                        update[id].add(createItem(id));
                    }}
                >
                    Add
                </button>
            </div>
            {entries.length === 0 ? <div className="text-xs opacity-60">{emptyLabel}</div> : null}
            <div className="space-y-2">
                {entries.map(([key, value]) => (
                    <div key={key} className="rounded border border-base-300 p-2">
                        {render(key, value, update[key], (newKey) => {
                            update((_, up) => [(up[key] as any).id(newKey), up.move(key, newKey)]);
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
