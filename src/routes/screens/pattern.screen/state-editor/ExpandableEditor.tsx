/*

for small text, it's small

*/

import {RefObject, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AnimatableBoolean, AnimatableNumber} from '../export-types';

type EditProps = {
    sel?: number;
    value: string;
    onChange: (v: string, sel: number) => void;
    onBlur: () => void;
    onCommit: () => void;
};

const OneLineGrowEditor = ({value, onChange, onBlur, onCommit, sel}: EditProps) => {
    const sizer = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState<number | undefined>(undefined);
    useLayoutEffect(() => {
        const _ = value;
        setSize(sizer.current?.getBoundingClientRect().width);
    }, [value]);
    const inp = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (sel != null && inp.current) {
            inp.current.focus();
            inp.current.selectionStart = sel;
            inp.current.selectionEnd = sel;
        }
    }, [sel]);
    return (
        <>
            <input
                ref={inp}
                style={{width: size}}
                onBlur={() => onBlur()}
                onKeyDown={(evt) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        if (evt.shiftKey) {
                            const st = evt.currentTarget.selectionStart ?? 0;
                            const ed = evt.currentTarget.selectionEnd ?? 0;
                            const nt = value.slice(0, st) + '\n' + value.slice(ed);
                            onChange(nt, st + 1);
                        } else {
                            onCommit();
                        }
                    }
                }}
                value={value}
                onChange={(evt) => onChange(evt.target.value, evt.target.selectionStart ?? 0)}
                className="input font-mono"
            />
            <span
                ref={sizer}
                className="input font-mono opacity-0 absolute pointer-events-none whitespace-pre"
                style={{
                    width: 'unset',
                }}
            >
                {value === '' ? ' ' : value}
            </span>
        </>
    );
};

const BasicTextarea = ({value, onChange, onBlur, onCommit, sel}: EditProps) => {
    const tar = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (sel && tar.current) {
            tar.current.focus();
            tar.current.selectionStart = sel;
            tar.current.selectionEnd = sel;
        }
    }, [sel]);

    return (
        <textarea
            ref={tar}
            value={value}
            onBlur={() => onBlur()}
            className="textarea font-mono"
            onChange={(evt) => onChange(evt.target.value, evt.currentTarget.selectionStart)}
        />
    );
};

export const BooleanInput = ({
    value,
    onChange,
}: {
    value?: AnimatableBoolean;
    onChange: (v: AnimatableBoolean | undefined) => void;
}) => {
    return (
        <ExpandableEditor
            value={(value ?? '').toString()}
            onChange={(v) => {
                const t = v.trim();
                onChange(t === 'true' ? true : t === 'false' ? false : t === '' ? undefined : t);
            }}
        />
    );
};

export const NumberInput = ({
    value,
    onChange,
}: {
    value?: AnimatableNumber;
    onChange: (v: AnimatableNumber | undefined) => void;
}) => {
    return (
        <ExpandableEditor
            value={(value ?? '').toString()}
            onChange={(v) => {
                const t = v.trim();
                const n = Number(t);
                onChange(Number.isFinite(n) ? n : v);
            }}
        />
    );
};

export const ExpandableEditor = ({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) => {
    const [state, setState] = useState<{txt: string; sel: number} | null>(null);
    const txt = state?.txt ?? value;

    const props: EditProps = {
        value: txt,
        sel: state?.sel,
        onBlur: () => {
            if (txt !== value) {
                onChange(txt);
            }
            setState(null);
        },
        onCommit: () => {
            if (txt !== value) {
                onChange(txt);
            }
        },
        onChange: (txt, sel) => setState({txt, sel}),
    };

    if (txt.length < 10 && !txt.includes('\n')) {
        return <OneLineGrowEditor {...props} />;
    }
    if (state) {
        return <BasicTextarea {...props} />;
    } else {
        // return <OneLineGrowEditor value={state} onChange={setState} />;
        return (
            <span className="input inline-flex max-w-20">
                <span
                    style={{
                        display: 'inline-block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                    className="font-mono whitespace-pre"
                    onClick={() => setState({txt, sel: 0})}
                >
                    {txt}
                </span>
            </span>
        );
    }
};

export const Labeled = ({
    text,
    children,
    className,
}: {
    text: string;
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <label className={'form-control ' + (className ?? '')}>
            <div className="label mr-2">
                <span className="label-text text-sm font-semibold">{text}</span>
            </div>
            {children}
        </label>
    );
};
