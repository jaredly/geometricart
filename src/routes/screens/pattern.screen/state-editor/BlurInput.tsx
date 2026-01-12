import React, {useState} from 'react';

export const BlurInput = ({
    value,
    onChange,
    placeholder,
    className,
    onBlur,
    style,
}: {
    className?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    style?: React.CSSProperties;
}) => {
    const [text, setText] = useState<string | null>(null);
    return (
        <input
            style={style}
            className={
                `input input-sm ${className ?? ''} ` +
                (text != null && text !== value ? 'outline-blue-400' : '')
            }
            value={text ?? value}
            onBlur={() => {
                if (text != null) {
                    if (text !== value) onChange(text);
                    setText(null);
                }
                onBlur?.();
            }}
            onKeyDown={(evt) => {
                if (evt.key === 'Enter') {
                    if (text != null) {
                        if (text !== value) onChange(text);
                        setText(null);
                    }
                }
            }}
            placeholder={placeholder}
            onChange={(evt) => setText(evt.target.value)}
        />
    );
};

export const BlurTextarea = ({
    value,
    onChange,
    placeholder,
    className,
    onBlur,
    style,
}: {
    className?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    style?: React.CSSProperties;
}) => {
    const [text, setText] = useState<string | null>(null);
    return (
        <textarea
            style={style}
            className={
                `textarea flex-1 font-mono text-xs input-sm ${className ?? ''} ` +
                (text != null && text !== value ? 'outline-blue-400' : '')
            }
            value={text ?? value}
            onBlur={() => {
                if (text != null) {
                    if (text !== value) onChange(text);
                    setText(null);
                }
                onBlur?.();
            }}
            onKeyDown={(evt) => {
                if (evt.key === 'Enter') {
                    if (text != null) {
                        if (text !== value) onChange(text);
                        setText(null);
                    }
                }
            }}
            placeholder={placeholder}
            onChange={(evt) => setText(evt.target.value)}
        />
    );
};
