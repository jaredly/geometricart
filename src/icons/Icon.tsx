import * as React from 'react';
import {SVGProps} from 'react';
import {useTouchClick} from '../editor/RenderIntersections';

/** Gotten from https://reactsvgicons.com/search?q=scissors */

export function GraphUp(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
            >
                <path d="M20 20H4V4"></path>
                <path d="M4 16.5L12 9l3 3l4.5-4.5"></path>
            </g>
        </svg>
    );
}

export function CheckboxChecked(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M14 0H2C.9 0 0 .9 0 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2M7 12.414L3.293 8.707l1.414-1.414L7 9.586l4.793-4.793l1.414 1.414z"
            ></path>
        </svg>
    );
}

export function CheckboxUnchecked(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M14 0H2C.9 0 0 .9 0 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2m0 14H2V2h12z"
            ></path>
        </svg>
    );
}

export function ExternalLinkIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{opacity: 1}}
        >
            <path d="M15 3h6v6m-11 5L21 3m-3 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
    );
}

export function DragMove2Fill(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M18 11V8l4 4l-4 4v-3h-5v5h3l-4 4l-4-4h3v-5H6v3l-4-4l4-4v3h5V6H8l4-4l4 4h-3v5z"
            ></path>
        </svg>
    );
}

export function DotsHorizontalOutline(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
                d="M6 12h.01m6 0h.01m5.99 0h.01"
            ></path>
        </svg>
    );
}

export function ChevronUp12(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 12 12"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M2.15 7.85a.5.5 0 0 0 .707 0l3.15-3.15l3.15 3.15a.5.5 0 0 0 .707-.707l-3.5-3.5a.5.5 0 0 0-.707 0l-3.5 3.5a.5.5 0 0 0 0 .707z"
                clipRule="evenodd"
            ></path>
        </svg>
    );
}

export function BaselineFilterCenterFocus(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2m0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3"
            ></path>
        </svg>
    );
}

export function BaselineZoomInMap(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M9 9V3H7v2.59L3.91 2.5L2.5 3.91L5.59 7H3v2zm12 0V7h-2.59l3.09-3.09l-1.41-1.41L17 5.59V3h-2v6zM3 15v2h2.59L2.5 20.09l1.41 1.41L7 18.41V21h2v-6zm12 0v6h2v-2.59l3.09 3.09l1.41-1.41L18.41 17H21v-2z"
            ></path>
        </svg>
    );
}

export function BaselineDownload(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path fill="currentColor" d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z"></path>
        </svg>
    );
}

export function TransitionFade(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M5.622 20q-.697 0-1.16-.462T4 18.384V5.616q0-.691.463-1.153T5.622 4h4.224v16zM12 20q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.54T12 20m0-3.616q-.31 0-.54-.23q-.23-.229-.23-.538t.23-.54t.54-.23t.54.23t.23.54t-.23.539t-.54.23m0-3.616q-.31 0-.54-.23T11.23 12t.23-.54t.54-.23t.54.23t.23.54t-.23.54t-.54.23m0-3.616q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.539t-.54.23m0-3.616q-.31 0-.54-.23t-.23-.539t.23-.54T12 4t.54.23t.23.54t-.23.539t-.54.23m1.866 12.653q-.31 0-.54-.23t-.23-.539t.23-.54t.54-.23t.539.23t.23.54t-.23.54t-.54.23m0-3.616q-.31 0-.539-.23t-.23-.54t.23-.539t.54-.23t.539.23t.23.54t-.23.539t-.54.23m0-3.615q-.31 0-.539-.23t-.23-.54t.23-.539t.54-.23t.539.23t.23.54t-.23.539t-.54.23m0-3.616q-.31 0-.539-.23t-.23-.539t.23-.54t.54-.23t.539.23t.23.54t-.23.54q-.23.23-.54.23M15.75 20q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.54t-.54.229m0-3.616q-.31 0-.54-.23q-.23-.229-.23-.538t.23-.54t.54-.23t.54.23t.23.54t-.23.539t-.54.23m0-3.616q-.31 0-.54-.23T14.98 12t.23-.54t.54-.23t.54.23t.23.54t-.23.54t-.54.23m0-3.616q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.539t-.54.23m0-3.616q-.31 0-.54-.23t-.23-.539t.23-.54t.54-.229t.54.23t.23.54t-.23.539t-.54.23m1.866 12.653q-.31 0-.54-.23t-.23-.539t.23-.54t.54-.23t.539.23t.23.54t-.23.54t-.54.23m0-3.616q-.31 0-.53-.23t-.22-.54t.216-.539t.535-.23q.309 0 .539.23t.23.54t-.23.539t-.54.23m.02-3.615q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.539.23t.23.54t-.23.539t-.54.23m0-3.616q-.309 0-.539-.23t-.23-.539t.23-.54t.54-.23t.539.23t.23.54t-.23.54q-.23.23-.54.23M19.232 20q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.229.54t-.23.54t-.54.229m0-3.616q-.309 0-.539-.23q-.23-.229-.23-.538t.23-.54t.54-.23t.54.23t.229.54t-.23.539t-.54.23m.02-3.616q-.31 0-.54-.23T18.48 12t.23-.54t.54-.23t.54.23t.23.54t-.23.54t-.54.23m0-3.616q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.539t-.54.23m0-3.616q-.31 0-.54-.23t-.23-.539t.23-.54t.54-.229t.54.23t.23.54t-.23.539t-.54.23"
            ></path>
        </svg>
    );
}

export function RoundPlus(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M18 12.998h-5v5a1 1 0 0 1-2 0v-5H6a1 1 0 0 1 0-2h5v-5a1 1 0 0 1 2 0v5h5a1 1 0 0 1 0 2"
            ></path>
        </svg>
    );
}

function RoundInfo(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"
            ></path>
        </svg>
    );
}

export function FrameInspectSharp(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            {...props}
        >
            <path
                fill="currentColor"
                d="M11.058 13.808q1.142 0 1.946-.804t.804-1.946t-.804-1.947q-.804-.803-1.946-.803t-1.946.803t-.804 1.947t.803 1.946t1.947.804m5.036 3l-2.76-2.78q-.5.384-1.071.582q-.573.198-1.205.198q-1.567 0-2.659-1.092q-1.091-1.091-1.091-2.656T8.399 8.4t2.657-1.093t2.658 1.091t1.094 2.659q0 .633-.201 1.205t-.584 1.072l2.785 2.765zM4 20v-5h1v4h4v1zm11 0v-1h4v-4h1v5zM4 9V4h5v1H5v4zm15 0V5h-4V4h5v5z"
            ></path>
        </svg>
    );
}

export const IconButton = ({
    onClick,
    onMouseOver,
    onMouseOut,
    hoverIcon,
    children,
    selected,
    disabled,
    color,
    className,
    size,
}: {
    onClick: () => void;
    onMouseOver?: (evt: React.MouseEvent) => void;
    onMouseOut?: (evt: React.MouseEvent) => void;
    hoverIcon?: React.ReactNode;
    children: React.ReactNode;
    selected?: boolean;
    disabled?: boolean;
    color?: string;
    className?: string;
    size?: number;
}) => {
    const handlers = useTouchClick<void>((_) => onClick());
    const [hover, setHover] = React.useState(false);
    return (
        <div
            {...handlers(undefined)}
            onMouseOver={(evt) => {
                setHover(true);
                if (onMouseOver) {
                    onMouseOver(evt);
                }
            }}
            onMouseOut={(evt) => {
                setHover(false);
                if (onMouseOut) {
                    onMouseOut(evt);
                }
            }}
            css={{
                display: 'inline-block',
                padding: 8,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: '1px solid #aaa',
                backgroundColor: selected ? 'rgba(150,150,150,0.4)' : 'rgba(0,0,0,0.4)',
                fontSize: size ?? 40,
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
            className={className}
            onClick={(evt) => {
                evt.stopPropagation();
                onClick();
            }}
        >
            {hover && hoverIcon ? hoverIcon : children}
        </div>
    );
};

export function BxSelectMultipleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M20 2H8c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM8 16V4h12l.002 12H8z" />
            <path d="M4 8H2v12c0 1.103.897 2 2 2h12v-2H4V8zm8.933 3.519l-1.726-1.726-1.414 1.414 3.274 3.274 5.702-6.84-1.538-1.282z" />
        </svg>
    );
}

export function CancelIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2m0 2c-1.9 0-3.6.6-4.9 1.7l11.2 11.2c1-1.4 1.7-3.1 1.7-4.9 0-4.4-3.6-8-8-8m4.9 14.3L5.7 7.1C4.6 8.4 4 10.1 4 12c0 4.4 3.6 8 8 8 1.9 0 3.6-.6 4.9-1.7z" />
        </svg>
    );
}

export function DeleteForeverIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M12 38c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4V14H12v24zm4.93-14.24l2.83-2.83L24 25.17l4.24-4.24 2.83 2.83L26.83 28l4.24 4.24-2.83 2.83L24 30.83l-4.24 4.24-2.83-2.83L21.17 28l-4.24-4.24zM31 8l-2-2H19l-2 2h-7v4h28V8z" />
        </svg>
    );
}

export function UndoIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" viewBox="0 0 24 24" height="1em" width="1em" {...props}>
            <path
                fill="currentColor"
                d="M5.34 4.468h2v2.557a7 7 0 11-1.037 10.011l1.619-1.185a5 5 0 10.826-7.384h2.591v2h-6v-6z"
            />
        </svg>
    );
}

export function RedoIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" viewBox="0 0 24 24" height="1em" width="1em" {...props}>
            <path
                fill="currentColor"
                d="M13.146 11.05l-.174-1.992 2.374-.208a5 5 0 10.82 6.173l2.002.5a7 7 0 11-1.315-7.996l-.245-2.803L18.6 4.55l.523 5.977-5.977.523z"
            />
        </svg>
    );
}

function CogIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" height="1em" width="1em" {...props}>
            <path
                fill="currentColor"
                d="M14.59 9.535a3.053 3.053 0 011.127-4.164l-1.572-2.723a3.017 3.017 0 01-1.529.414A3.052 3.052 0 019.574 0H6.429a3.009 3.009 0 01-.406 1.535c-.839 1.454-2.706 1.948-4.17 1.106L.281 5.364a3 3 0 011.123 1.117 3.053 3.053 0 01-1.12 4.16l1.572 2.723c.448-.261.967-.41 1.522-.41A3.052 3.052 0 016.42 16h3.145a3.012 3.012 0 01.406-1.519 3.053 3.053 0 014.163-1.11l1.572-2.723a3.008 3.008 0 01-1.116-1.113zM8 11.24a3.24 3.24 0 110-6.48 3.24 3.24 0 010 6.48z"
            />
        </svg>
    );
}

export function SelectDragIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M13 17h4v-4h2v4h4v2h-4v4h-2v-4h-4v-2m-2 0v2H9v-2h2m-4 0v2H5v-2h2m12-8v2h-2V9h2m0-4v2h-2V5h2m-4 0v2h-2V5h2m-4 0v2H9V5h2M7 5v2H5V5h2m0 8v2H5v-2h2m0-4v2H5V9h2z" />
        </svg>
    );
}

export function ImagesIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 16 16" height="1em" width="1em" {...props}>
            <path
                fillRule="evenodd"
                d="M12.002 4h-10a1 1 0 00-1 1v8l2.646-2.354a.5.5 0 01.63-.062l2.66 1.773 3.71-3.71a.5.5 0 01.577-.094l1.777 1.947V5a1 1 0 00-1-1zm-10-1a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-10zm4 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
            />
            <path
                fillRule="evenodd"
                d="M4 2h10a1 1 0 011 1v8a1 1 0 01-1 1v1a2 2 0 002-2V3a2 2 0 00-2-2H4a2 2 0 00-2 2h1a1 1 0 011-1z"
            />
        </svg>
    );
}

export function MirrorIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path
                fillRule="evenodd"
                d="M12 10.75a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75zm0 4a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75zm0 4a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75zm0-12a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75zm0-4a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75zm9.553 3.314A.75.75 0 0122 6.75v10.5a.75.75 0 01-1.256.554l-5.75-5.25a.75.75 0 010-1.108l5.75-5.25a.75.75 0 01.809-.132zM16.613 12l3.887 3.55v-7.1L16.612 12zM2.447 17.936A.75.75 0 012 17.25V6.75a.75.75 0 011.256-.554l5.75 5.25a.75.75 0 010 1.108l-5.75 5.25a.75.75 0 01-.809.132zM7.387 12L3.5 8.45v7.1L7.388 12z"
            />
        </svg>
    );
}

export function PaintFillIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M19.228 18.732l1.768-1.768 1.767 1.768a2.5 2.5 0 11-3.535 0zM8.878 1.08l11.314 11.313a1 1 0 010 1.415l-8.485 8.485a1 1 0 01-1.414 0l-8.485-8.485a1 1 0 010-1.415l7.778-7.778-2.122-2.121L8.88 1.08zM11 6.03L3.929 13.1H18.07L11 6.03z" />
        </svg>
    );
}

export function BringToFrontIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M11 3a1 1 0 011 1v2h5a1 1 0 011 1v5h2a1 1 0 011 1v7a1 1 0 01-1 1h-7a1 1 0 01-1-1v-2H7a1 1 0 01-1-1v-5H4a1 1 0 01-1-1V4a1 1 0 011-1h7zm5 5H8v8h8V8z" />
        </svg>
    );
}

export function SendToBackIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M11 3a1 1 0 011 1v2h5a1 1 0 011 1v5h2a1 1 0 011 1v7a1 1 0 01-1 1h-7a1 1 0 01-1-1v-2H7a1 1 0 01-1-1v-5H4a1 1 0 01-1-1V4a1 1 0 011-1h7zm5 5h-4v3a1 1 0 01-1 1H8v4h4v-3a1 1 0 011-1h3V8z" />
        </svg>
    );
}

export function LineLongerIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" viewBox="0 0 24 24" height="1em" width="1em" {...props}>
            <path
                stroke="currentColor"
                fill="none"
                d="M2 12 L 22 12 M 18 8 L 22 12 L 18 16 M 6 8 L 2 12 L 6 16"
            />
        </svg>
    );
}

export function LineShorterIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" viewBox="0 0 24 24" height="1em" width="1em" {...props}>
            <path
                stroke="currentColor"
                fill="none"
                d="M6 12 L 18 12 M 22 8 L 18 12 L 22 16 M 2 8 L 6 12 L 2 16"
            />
        </svg>
    );
}

export function LibraryAddIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M8 12H4v28c0 2.21 1.79 4 4 4h28v-4H8V12zm32-8H16c-2.21 0-4 1.79-4 4v24c0 2.21 1.79 4 4 4h24c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4zm-2 18h-8v8h-4v-8h-8v-4h8v-8h4v8h8v4z" />
        </svg>
    );
}

export function AddIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 512 512" fill="currentColor" height="1em" width="1em" {...props}>
            <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={32}
                d="M256 112v288M400 256H112"
            />
        </svg>
    );
}

export function SubtractLineIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M5 11h14v2H5z" />
        </svg>
    );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M11 9 H20 A2 2 0 0 1 22 11 V20 A2 2 0 0 1 20 22 H11 A2 2 0 0 1 9 20 V11 A2 2 0 0 1 11 9 z" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    );
}

export function VectorSelectionIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M3 1h2v2H3v2H1V3a2 2 0 012-2m11 0a2 2 0 012 2v2h-2V3h-2V1h2m6 6a2 2 0 012 2v2h-2V9h-2V7h2m2 13a2 2 0 01-2 2h-2v-2h2v-2h2v2m-2-7h2v3h-2v-3m-7-4V7h3v3h-2V9h-1m0 13v-2h3v2h-3m-4 0a2 2 0 01-2-2v-2h2v2h2v2H9m-2-6v-3h2v1h1v2H7M7 3V1h3v2H7M3 16a2 2 0 01-2-2v-2h2v2h2v2H3M1 7h2v3H1V7m8 0h2v2H9v2H7V9a2 2 0 012-2m7 7a2 2 0 01-2 2h-2v-2h2v-2h2v2z" />
        </svg>
    );
}

export function ScissorsCuttingIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M11 21H7v-2h4v2m4.5-2H17v2h-4v-2h.2l-1.4-6.1-2.5.6c-.1.5-.3.9-.5 1.3-.9 1.5-2.8 1.9-4.3 1-1.5-.9-1.9-2.8-1-4.3.9-1.5 2.8-1.9 4.3-1 .4.2.7.6.9.9l2.5-.6-.6-2.5c-.4-.1-.8-.3-1.2-.5C8 6.9 7.5 5 8.4 3.5c.9-1.5 2.8-1.9 4.3-1 1.5.9 1.9 2.8 1 4.3-.2.4-.6.7-.9.9L15.5 19M7 11.8c-.7-.5-1.7-.2-2.2.5-.5.7-.2 1.7.5 2.1.7.5 1.7.3 2.2-.5.4-.7.2-1.7-.5-2.1M12.4 6c.5-.7.2-1.7-.5-2.2-.7-.5-1.7-.2-2.2.5-.4.7-.2 1.7.6 2.2.7.4 1.7.2 2.1-.5m.4 5.3c-.2-.1-.4-.1-.5.1-.1.2-.1.4.1.5.2.1.4.1.5-.1.2-.2.1-.4-.1-.5M21 8.5L14.5 10l.5 2.2 7.5-1.8.5-.7-2-1.2M23 19h-4v2h4v-2M5 19H1v2h4v-2z" />
        </svg>
    );
}

export function MagicWandIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" height="1em" width="1em" {...props}>
            <path
                fill="currentColor"
                d="M4 3L2 1H1v1l2 2zm1-3h1v2H5zm4 5h2v1H9zm1-3V1H9L7 3l1 1zM0 5h2v1H0zm5 4h1v2H5zM1 9v1h1l2-2-1-1zm14.781 4.781L5.842 3.842a.752.752 0 00-1.061 0l-.939.939a.752.752 0 000 1.061l9.939 9.939a.752.752 0 001.061 0l.939-.939a.752.752 0 000-1.061zM7.5 8.5l-3-3 1-1 3 3-1 1z"
            />
        </svg>
    );
}

export function CubeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M21.406 6.086l-9-4a1.001 1.001 0 00-.813 0l-9 4c-.02.009-.034.024-.054.035-.028.014-.058.023-.084.04-.022.015-.039.034-.06.05a.87.87 0 00-.19.194c-.02.028-.041.053-.059.081a1.119 1.119 0 00-.076.165c-.009.027-.023.052-.031.079A1.013 1.013 0 002 7v10c0 .396.232.753.594.914l9 4c.13.058.268.086.406.086a.997.997 0 00.402-.096l.004.01 9-4A.999.999 0 0022 17V7a.999.999 0 00-.594-.914zM12 4.095L18.538 7 12 9.905l-1.308-.581L5.463 7 12 4.095zm1 15.366V11.65l7-3.111v7.812l-7 3.11z" />
        </svg>
    );
}

export function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            {...props}
        >
            <path stroke="none" d="M0 0h24v24H0z" />
            <path d="M4 20h4L18.5 9.5a1.5 1.5 0 00-4-4L4 16v4M13.5 6.5l4 4" />
        </svg>
    );
}

export function CheckmarkIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" height="1em" width="1em" {...props}>
            <path fill="currentColor" d="M13.5 2L6 9.5 2.5 6 0 8.5l6 6 10-10z" />
        </svg>
    );
}

export function DrillIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            data-name="Layer 1"
            viewBox="0 0 24 24"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M19 4H9a1 1 0 00-1 1v2H3a1 1 0 000 2h5v4a1 1 0 002 0v-1h4v7a1 1 0 001 1h2a3 3 0 003-3v-5.18A3 3 0 0022 9V7a3 3 0 00-3-3zm-1 13a1 1 0 01-1 1h-1v-6h2zm2-8a1 1 0 01-1 1h-9V6h6v1a1 1 0 002 0V6h1a1 1 0 011 1z" />
        </svg>
    );
}

export function IconHistoryToggle(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            {...props}
        >
            <path stroke="none" d="M0 0h24v24H0z" />
            <path d="M12 8v4l3 3M8.56 3.69a9 9 0 00-2.92 1.95M3.69 8.56A9 9 0 003 12M3.69 15.44a9 9 0 001.95 2.92M8.56 20.31A9 9 0 0012 21M15.44 20.31a9 9 0 002.92-1.95M20.31 15.44A9 9 0 0021 12M20.31 8.56a9 9 0 00-1.95-2.92M15.44 3.69A9 9 0 0012 3" />
        </svg>
    );
}

function IconViewHide(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M12.81 4.36l-1.77 1.78a4 4 0 00-4.9 4.9l-2.76 2.75C2.06 12.79.96 11.49.2 10a11 11 0 0112.6-5.64zm3.8 1.85c1.33 1 2.43 2.3 3.2 3.79a11 11 0 01-12.62 5.64l1.77-1.78a4 4 0 004.9-4.9l2.76-2.75zm-.25-3.99l1.42 1.42L3.64 17.78l-1.42-1.42L16.36 2.22z" />
        </svg>
    );
}

export function IconVerticalAlignTop(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M859.9 168H164.1c-4.5 0-8.1 3.6-8.1 8v60c0 4.4 3.6 8 8.1 8h695.8c4.5 0 8.1-3.6 8.1-8v-60c0-4.4-3.6-8-8.1-8zM518.3 355a8 8 0 00-12.6 0l-112 141.7a7.98 7.98 0 006.3 12.9h73.9V848c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V509.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 355z" />
        </svg>
    );
}

export function IconVerticalAlignBottom(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M859.9 780H164.1c-4.5 0-8.1 3.6-8.1 8v60c0 4.4 3.6 8 8.1 8h695.8c4.5 0 8.1-3.6 8.1-8v-60c0-4.4-3.6-8-8.1-8zM505.7 669a8 8 0 0012.6 0l112-141.7c4.1-5.2.4-12.9-6.3-12.9h-74.1V176c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v338.3H400c-6.7 0-10.4 7.7-6.3 12.9l112 141.8z" />
        </svg>
    );
}

export function IconSpeedtest(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M11.628 16.186l-2.047-2.14 6.791-5.953 1.21 1.302zm8.837 6.047c2.14-2.14 3.535-5.117 3.535-8.466 0-6.604-5.395-12-12-12s-12 5.396-12 12c0 3.35 1.302 6.326 3.535 8.466l1.674-1.675c-1.767-1.767-2.79-4.093-2.79-6.79A9.568 9.568 0 0112 4.185a9.568 9.568 0 019.581 9.581c0 2.605-1.116 5.024-2.79 6.791z" />
        </svg>
    );
}

export function IconVerticalAlignMiddle(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M859.9 474H164.1c-4.5 0-8.1 3.6-8.1 8v60c0 4.4 3.6 8 8.1 8h695.8c4.5 0 8.1-3.6 8.1-8v-60c0-4.4-3.6-8-8.1-8zm-353.6-74.7c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5c3.7-4.7.4-11.7-5.7-11.7H550V104c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v156h-62.8c-6 0-9.4 7-5.7 11.7l100.8 127.6zm11.4 225.4a7.14 7.14 0 00-11.3 0L405.6 752.3a7.23 7.23 0 005.7 11.7H474v156c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V764h62.8c6 0 9.4-7 5.7-11.7L517.7 624.7z" />
        </svg>
    );
}

export function IconEye(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M396 512a112 112 0 10224 0 112 112 0 10-224 0zm546.2-25.8C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 000 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM508 688c-97.2 0-176-78.8-176-176s78.8-176 176-176 176 78.8 176 176-78.8 176-176 176z" />
        </svg>
    );
}

export function IconEyeInvisible(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M508 624a112 112 0 00112-112c0-3.28-.15-6.53-.43-9.74L498.26 623.57c3.21.28 6.45.43 9.74.43zm370.72-458.44L836 122.88a8 8 0 00-11.31 0L715.37 232.23Q624.91 186 512 186q-288.3 0-430.2 300.3a60.3 60.3 0 000 51.5q56.7 119.43 136.55 191.45L112.56 835a8 8 0 000 11.31L155.25 889a8 8 0 0011.31 0l712.16-712.12a8 8 0 000-11.32zM332 512a176 176 0 01258.88-155.28l-48.62 48.62a112.08 112.08 0 00-140.92 140.92l-48.62 48.62A175.09 175.09 0 01332 512z" />
            <path d="M942.2 486.2Q889.4 375 816.51 304.85L672.37 449A176.08 176.08 0 01445 676.37L322.74 798.63Q407.82 838 512 838q288.3 0 430.2-300.3a60.29 60.29 0 000-51.5z" />
        </svg>
    );
}

export function IconDelete(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z" />
        </svg>
    );
}

export function IconAngleAcute(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M20 19H4.09L14.18 4.43l1.64 1.14-4.54 6.56c1.61.83 2.72 2.49 2.72 4.41 0 .16 0 .31-.03.46H20v2M7.91 17h4.05c.04-.15.04-.3.04-.46 0-1.26-.76-2.32-1.86-2.76L7.91 17z" />
        </svg>
    );
}

export function IconTabUnselected(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
            <path d="M1 9h2V7H1v2m0 4h2v-2H1v2m0-8h2V3a2 2 0 00-2 2m8 16h2v-2H9v2m-8-4h2v-2H1v2m2 4v-2H1a2 2 0 002 2M21 3h-8v6h10V5a2 2 0 00-2-2m0 14h2v-2h-2v2M9 5h2V3H9v2M5 21h2v-2H5v2M5 5h2V3H5v2m16 16a2 2 0 002-2h-2v2m0-8h2v-2h-2v2m-8 8h2v-2h-2v2m4 0h2v-2h-2v2z" />
        </svg>
    );
}

export function IconUndo(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" viewBox="0 0 24 24" height="1em" width="1em" {...props}>
            <path
                fill="currentColor"
                d="M5.34 4.468h2v2.557a7 7 0 11-1.037 10.011l1.619-1.185a5 5 0 10.826-7.384h2.591v2h-6v-6z"
            />
        </svg>
    );
}

export function IconArrowAutofitWidth(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            {...props}
        >
            <path stroke="none" d="M0 0h24v24H0z" />
            <path d="M4 12V6a2 2 0 012-2h12a2 2 0 012 2v6M10 18H3M21 18h-7M6 15l-3 3 3 3M18 15l3 3-3 3" />
        </svg>
    );
}
