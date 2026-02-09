import {useMemo} from 'react';

export const AccordionSidebar = ({
    items,
    expanded,
    setExpanded,
}: {
    items: {title: React.ReactNode; body: React.ReactNode; key: string}[];
    expanded: Record<string, boolean>;
    setExpanded: (key: string, expanded: boolean) => void;
}) => {
    const everExpanded = useMemo<Record<string, boolean>>(() => ({}), []);
    Object.keys(expanded).forEach((k) => {
        if (expanded[k]) everExpanded[k] = true;
    });
    return (
        <div className="flex flex-col items-stretch flex-1 min-w-0 min-h-0 overflow-auto">
            {items.map((item) => (
                <div key={item.key} className="contents">
                    <div
                        onClick={() => setExpanded(item.key, !expanded[item.key])}
                        className={
                            'border-b border-amber-600 transition-colors px-4 py-2 cursor-pointer' +
                            (expanded[item.key]
                                ? ' bg-amber-950 hover:bg-amber-900'
                                : ' hover:bg-slate-700')
                        }
                    >
                        {item.title}
                    </div>
                    {everExpanded ? (
                        <div className={'overflow-auto ' + (expanded[item.key] ? '' : 'hidden')}>
                            {item.body}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
};
