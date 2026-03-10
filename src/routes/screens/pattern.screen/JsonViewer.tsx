import {useState} from 'react';

const Line = ({children, onExpand}: {children: React.ReactNode; onExpand?(): void}) => {
    return (
        <div
            className={'px-2 py-1' + (onExpand ? ' cursor-pointer' : '')}
            onClick={(evt) => {
                evt.stopPropagation();
                onExpand?.();
            }}
        >
            {children}
        </div>
    );
};

const trunc = (v: any) => {
    if (!v || typeof v === 'boolean') {
        return v + '';
    }
    if (typeof v === 'number') {
        if (Number.isInteger(v)) return '' + v;
        return v.toFixed(2);
    }
    if (Array.isArray(v)) {
        if (!v.length) return '[]';
        return `[(${v.length})]`;
    }
    if (typeof v === 'object') {
        const n = Object.keys(v).length;
        return n ? `{(${n})}` : '{}';
    }
    if (typeof v === 'string') return JSON.stringify(v);
    return '?';
};

export const JsonViewer = ({value}: {value: any}) => {
    const [expanded, setExpanded] = useState(false);

    if (!value || typeof value === 'number' || typeof value === 'boolean') {
        return <Line>{'' + value}</Line>;
    }
    if (typeof value === 'string') {
        return <Line>{JSON.stringify(value)}</Line>;
    }
    if (Array.isArray(value)) {
        if (!expanded) {
            return (
                <Line onExpand={() => setExpanded(true)}>
                    {value.length > 4
                        ? '[' + value.slice(0, 3).map(trunc).join(',') + `...(${value.length - 3})]`
                        : '[' + value.map(trunc).join(',') + ']'}
                </Line>
            );
        }
        return (
            <div
                onClick={(evt) => {
                    evt.stopPropagation();
                    setExpanded(false);
                }}
                className="pl-2 border-l border-l-amber-300"
            >
                {value.map((v, i) => (
                    <JsonViewer key={i} value={v} />
                ))}
            </div>
        );
    }
    if (typeof value === 'object') {
        const items = Object.entries(value);
        if (!expanded) {
            return (
                <Line onExpand={() => setExpanded(true)}>
                    {items.length > 4
                        ? '{' +
                          items
                              .slice(0, 3)
                              .map(([k, v]) => `${k}:${trunc(v)}`)
                              .join(',') +
                          `...(${items.length - 3})}`
                        : '{' + items.map(([k, v]) => `${k}:${trunc(v)}`).join(',') + '}'}
                </Line>
            );
        }
        return (
            <div
                onClick={(evt) => {
                    evt.stopPropagation();
                    setExpanded(false);
                }}
                className="pl-2 border-l border-l-amber-300"
            >
                {items.map(([k, v]) => (
                    <span key={k}>
                        {k}: <JsonViewer value={v} />
                    </span>
                ))}
            </div>
        );
    }
    return <Line>???</Line>;
};
