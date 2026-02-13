import {useMemo} from 'react';

export const AccordionSidebar = ({
    items,
    expanded,
    setExpanded,
}: {
    items: {title: React.ReactNode; body: React.ReactNode; key: string; noCache?: boolean}[];
    expanded: Record<string, boolean>;
    setExpanded: (key: string, expanded: boolean) => void;
}) => {
    const everExpanded = useMemo<Record<string, boolean>>(() => ({}), []);
    Object.keys(expanded).forEach((k) => {
        if (expanded[k]) everExpanded[k] = true;
    });
    return (
        <div className="flex flex-col items-stretch flex-1 min-w-0 min-h-0 overflow-auto border-t border-amber-600 ">
            {items.map((item) => (
                <div key={item.key} className="contents">
                    <div
                        onClick={() => setExpanded(item.key, !expanded[item.key])}
                        className={
                            'border-b border-l border-r border-amber-600 transition-colors px-4 py-2 cursor-pointer' +
                            ' bg-amber-950 hover:bg-amber-900'
                        }
                    >
                        {item.title}
                    </div>
                    {(item.noCache ? expanded[item.key] : everExpanded[item.key]) ? (
                        <div
                            className={
                                'overflow-auto border-b border-amber-600 flex-1  ' +
                                (expanded[item.key] ? '' : 'hidden')
                            }
                        >
                            {item.body}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
};
