import React, {useState, useEffect} from 'react';

export const JsonEditor = <T,>({
    label,
    value,
    onChange,
}: {
    label: string;
    value: T;
    onChange: (next: T) => void;
}) => {
    const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        setDraft(JSON.stringify(value, null, 2));
    }, [value]);

    if (!expanded) {
        return (
            <div
                className="form-control h-10 overflow-hidden opacity-40 flex gap-2 p-2"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="label-text font-semibold">{label}</span>
                <pre>{JSON.stringify(value)}</pre>
            </div>
        );
    }

    return (
        <div className="form-control flex flex-col p-2">
            <div className="label" onClick={() => setExpanded(!expanded)}>
                <span className="label-text font-semibold">{label}</span>
                {error ? <span className="label-text-alt text-error">{error}</span> : null}
            </div>
            <textarea
                className={`textarea textarea-bordered font-mono text-xs min-h-[120px] ${error ? 'textarea-error' : ''}`}
                value={draft}
                onChange={(evt) => setDraft(evt.target.value)}
                onBlur={() => {
                    try {
                        onChange(JSON.parse(draft));
                        setError(null);
                    } catch (err) {
                        setError('Invalid JSON');
                    }
                }}
            />
        </div>
    );
};
