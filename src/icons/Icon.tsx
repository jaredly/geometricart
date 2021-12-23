/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as React from 'react';

export const IconButton = ({
    onClick,
    children,
    selected,
    disabled,
    color,
}: {
    onClick: (evt: React.MouseEvent) => void;
    children: React.ReactNode;
    selected?: boolean;
    disabled?: boolean;
    color?: string;
}) => {
    return (
        <div
            css={{
                display: 'inline-block',
                padding: 8,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: '1px solid #aaa',
                backgroundColor: selected
                    ? 'rgba(150,150,150,0.4)'
                    : 'rgba(0,0,0,0.4)',
                fontSize: 40,
                color: color ?? (selected ? 'black' : 'white'),
                opacity: disabled ? 0.5 : 1,
                lineHeight: 0.5,
                ':hover': disabled
                    ? {}
                    : {
                          backgroundColor: 'rgba(50,50,50,0.4)',
                          border: '1px solid #fff',
                      },
            }}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export function BxSelectMultipleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M20 2H8c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM8 16V4h12l.002 12H8z" />
            <path d="M4 8H2v12c0 1.103.897 2 2 2h12v-2H4V8zm8.933 3.519l-1.726-1.726-1.414 1.414 3.274 3.274 5.702-6.84-1.538-1.282z" />
        </svg>
    );
}

export function CancelIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2m0 2c-1.9 0-3.6.6-4.9 1.7l11.2 11.2c1-1.4 1.7-3.1 1.7-4.9 0-4.4-3.6-8-8-8m4.9 14.3L5.7 7.1C4.6 8.4 4 10.1 4 12c0 4.4 3.6 8 8 8 1.9 0 3.6-.6 4.9-1.7z" />
        </svg>
    );
}

export function DeleteForeverIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M12 38c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4V14H12v24zm4.93-14.24l2.83-2.83L24 25.17l4.24-4.24 2.83 2.83L26.83 28l4.24 4.24-2.83 2.83L24 30.83l-4.24 4.24-2.83-2.83L21.17 28l-4.24-4.24zM31 8l-2-2H19l-2 2h-7v4h28V8z" />
        </svg>
    );
}

export function UndoIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M5.34 4.468h2v2.557a7 7 0 11-1.037 10.011l1.619-1.185a5 5 0 10.826-7.384h2.591v2h-6v-6z"
            />
        </svg>
    );
}

export function RedoIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M13.146 11.05l-.174-1.992 2.374-.208a5 5 0 10.82 6.173l2.002.5a7 7 0 11-1.315-7.996l-.245-2.803L18.6 4.55l.523 5.977-5.977.523z"
            />
        </svg>
    );
}

export function CogIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M14.59 9.535a3.053 3.053 0 011.127-4.164l-1.572-2.723a3.017 3.017 0 01-1.529.414A3.052 3.052 0 019.574 0H6.429a3.009 3.009 0 01-.406 1.535c-.839 1.454-2.706 1.948-4.17 1.106L.281 5.364a3 3 0 011.123 1.117 3.053 3.053 0 01-1.12 4.16l1.572 2.723c.448-.261.967-.41 1.522-.41A3.052 3.052 0 016.42 16h3.145a3.012 3.012 0 01.406-1.519 3.053 3.053 0 014.163-1.11l1.572-2.723a3.008 3.008 0 01-1.116-1.113zM8 11.24a3.24 3.24 0 110-6.48 3.24 3.24 0 010 6.48z"
            />
        </svg>
    );
}

export function SelectDragIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M13 17h4v-4h2v4h4v2h-4v4h-2v-4h-4v-2m-2 0v2H9v-2h2m-4 0v2H5v-2h2m12-8v2h-2V9h2m0-4v2h-2V5h2m-4 0v2h-2V5h2m-4 0v2H9V5h2M7 5v2H5V5h2m0 8v2H5v-2h2m0-4v2H5V9h2z" />
        </svg>
    );
}
