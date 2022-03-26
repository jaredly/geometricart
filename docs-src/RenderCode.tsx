import * as React from 'react';
import Highlight, { defaultProps } from 'prism-react-renderer';
import {
    DOC_COMMENT,
    EXAMPLES,
    FullToken,
    organizeTokens,
    SHOW,
} from './organizeTokens';
import { Info, ByStart, TraceOutput, getWidget, hasVisual } from './Fixtures';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const RenderCode = React.memo(
    ({
        source,
        byStart,
        traceOutput,
        hover,
        setHover,
        pins,
        setPins,
        info,
        examplesMatching,
    }: {
        source: string;
        info: Info;
        pins: { [key: number]: boolean };
        setPins: React.Dispatch<
            React.SetStateAction<{ [key: number]: boolean }>
        >;
        byStart: ByStart;
        traceOutput: TraceOutput;
        hover: number | null;
        setHover: (id: number | null) => void;
        examplesMatching: { [key: number]: JSX.Element };
    }) => {
        return (
            <Highlight {...defaultProps} code={source} language="tsx">
                {({
                    className,
                    style,
                    tokens: lines,
                    getLineProps,
                    getTokenProps,
                }) => {
                    const organized = organizeTokens(
                        lines,
                        byStart,
                        traceOutput,
                        info,
                    );
                    return (
                        <pre
                            className={className}
                            style={{
                                ...style,
                                whiteSpace: 'pre-wrap',
                                flex: 1,
                                // fontSize: 20,
                                cursor: 'default',
                                padding: '1em',
                            }}
                        >
                            {renderFull(
                                organized,
                                getTokenProps,
                                byStart,
                                traceOutput,
                                '',
                                hover,
                                (id) => setHover(id),
                                pins,
                                setPins,
                                examplesMatching,
                                info,
                            )}
                        </pre>
                    );
                }}
            </Highlight>
        );
    },
);
const renderFull = (
    token: FullToken,
    getTokenProps: Highlight['getTokenProps'],
    byStart: ByStart,
    traceOutput: TraceOutput,
    key: string,
    hover: number | null,
    onHover: (i: number | null) => void,
    pins: { [key: number]: boolean },
    setPins: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>,
    examplesMatching: { [key: number]: JSX.Element },
    info: Info,
) => {
    return (
        <span
            key={key}
            data-at={token.start}
            data-end={token.end}
            data-id={token.id}
            data-widgets={JSON.stringify(token.widgets)}
            style={{
                ...(Array.isArray(token.content) && key !== ''
                    ? {
                          backgroundColor: 'rgba(0,0,0,0.3)',
                      }
                    : undefined),

                cursor:
                    token.id != null && hasVisual(token.id, traceOutput)
                        ? 'pointer'
                        : 'unset',
            }}
            className={
                token.id != null && (token.id === hover || pins[token.id])
                    ? 'underline-tokens'
                    : ''
            }
            onClick={
                token.id && hasVisual(token.id, traceOutput)
                    ? (evt) => {
                          evt.stopPropagation();
                          setPins((s) => ({
                              ...s,
                              [token.id!]: !s[token.id!],
                          }));
                      }
                    : undefined
            }
            onMouseOver={
                token.id != null
                    ? (evt) => {
                          evt.stopPropagation();
                          onHover(token.id!);
                      }
                    : undefined
            }
            onMouseOut={
                token.id != null
                    ? (evt) => {
                          evt.stopPropagation();
                          onHover(null);
                      }
                    : undefined
            }
        >
            {token.widgets.map((id) => getWidget(id.id, traceOutput, '1em'))}
            {Array.isArray(token.content) ? (
                token.content.map((inner, i) =>
                    renderFull(
                        inner,
                        getTokenProps,
                        byStart,
                        traceOutput,
                        key + ':' + i,
                        hover,
                        onHover,
                        pins,
                        setPins,
                        examplesMatching,
                        info,
                    ),
                )
            ) : token.content.types.includes(DOC_COMMENT) ? (
                <div
                    style={{
                        whiteSpace: 'normal',
                        color: '#eee',
                        lineHeight: 1.5,
                        padding: '8px 16px',
                        margin: '8px 0',
                        maxWidth: 800,
                    }}
                >
                    <ReactMarkdown
                        children={token.content.content.replace(/^\s*\*/gm, '')}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        className="md"
                    />
                </div>
            ) : token.content.types.includes(EXAMPLES) ? (
                examplesMatching[+token.content.content]
            ) : token.content.types.includes(SHOW) ? (
                <span>
                    SHOW{' '}
                    {JSON.stringify(
                        info.shows
                            .find((s) => s.start === token.start)
                            ?.items.map((id) =>
                                traceOutput[id]
                                    ? traceOutput[id].values[0]
                                    : null,
                            ),
                    )}{' '}
                </span>
            ) : (
                <span {...getTokenProps({ token: token.content })} />
            )}
        </span>
    );
};
