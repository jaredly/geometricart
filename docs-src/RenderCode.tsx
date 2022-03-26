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
import { widgets } from './functionWidgets';

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
                <ShowLog info={info} token={token} traceOutput={traceOutput} />
            ) : (
                <span {...getTokenProps({ token: token.content })} />
            )}
        </span>
    );
};

function ShowLog({
    info,
    token,
    traceOutput,
}: {
    info: Info;
    token: FullToken;
    traceOutput: TraceOutput;
}) {
    const show = info.shows.find((s) => s.start === token.start);
    const [index, setIndex] = React.useState(0);
    if (!show) return null;
    const counts = show.items
        .filter((id) => traceOutput[id])
        .map((id) => traceOutput[id].values.length);
    if (!counts.length) return null;
    const minCount = counts.reduce((a, b) => Math.min(a, b));
    return (
        <span style={{ display: 'inline-block' }}>
            // @show
            {minCount > 1 ? (
                <>
                    <button
                        onClick={() =>
                            setIndex((i) => (i <= 0 ? minCount - 1 : i - 1))
                        }
                    >
                        &lt;
                    </button>
                    {index + 1}/{minCount}
                    <button
                        onClick={() =>
                            setIndex((i) => (i <= 0 ? minCount - 1 : i - 1))
                        }
                    >
                        &gt;
                    </button>
                </>
            ) : null}
            <div style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
                {show.items
                    .filter((id) => traceOutput[id])
                    .map((id, i) => (
                        <div
                            style={{
                                width: 300,
                                height: 300,
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                outline: '1px solid magenta',
                                margin: 4,
                            }}
                        >
                            {info.expressions[id].type &&
                            widgets[info.expressions[id].type!.type] ? (
                                widgets[info.expressions[id].type!.type](
                                    traceOutput[id].values[index],
                                    null,
                                    '300px',
                                )
                            ) : (
                                <>
                                    {info.expressions[id].type?.type ||
                                        '[no type info]'}
                                    {JSON.stringify(
                                        traceOutput[id].values[index],
                                    )}
                                </>
                            )}
                        </div>
                    ))}
            </div>
            {/* {JSON.stringify(
            info.shows
                .find((s) => s.start === token.start)
                ?.items.map((id) =>
                    traceOutput[id]
                        ? traceOutput[id].values[0]
                        : null,
                ),
        )}{' '} */}
        </span>
    );
}
