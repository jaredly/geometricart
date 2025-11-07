import * as React from 'react';
import Highlight, {defaultProps} from 'prism-react-renderer';
import {DOC_COMMENT, EXAMPLES, FullToken, organizeTokens, SHOW} from './organizeTokens';
import {Info, ByStart, TraceOutput, getWidget, hasVisual} from './Fixtures';

import {widgets} from './functionWidgets';

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
        pins: {[key: number]: boolean};
        setPins: React.Dispatch<React.SetStateAction<{[key: number]: boolean}>>;
        byStart: ByStart;
        traceOutput: TraceOutput;
        hover: number | null;
        setHover: (id: number | null) => void;
        examplesMatching: {[key: number]: JSX.Element};
    }) => {
        return (
            <Highlight {...defaultProps} code={source} language="tsx">
                {({className, style, tokens: lines, getLineProps, getTokenProps}) => {
                    const organized = organizeTokens(lines, byStart, traceOutput, info);
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
    pins: {[key: number]: boolean},
    setPins: React.Dispatch<React.SetStateAction<{[key: number]: boolean}>>,
    examplesMatching: {[key: number]: JSX.Element},
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

                cursor: token.id != null && hasVisual(token.id, traceOutput) ? 'pointer' : 'unset',
            }}
            className={
                token.id != null && (token.id === hover || pins[token.id]) ? 'underline-tokens' : ''
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
                    {/* <ReactMarkdown
                        children={token.content.content.replace(/^\s*\* /gm, '')}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        className="md"
                    /> */}
                </div>
            ) : token.content.types.includes(EXAMPLES) ? (
                examplesMatching[+token.content.content]
            ) : token.content.types.includes(SHOW) ? (
                <ShowLog
                    text={token.content.content}
                    info={info}
                    token={token}
                    traceOutput={traceOutput}
                />
            ) : (
                <span {...getTokenProps({token: token.content})} />
            )}
        </span>
    );
};

function ShowLog({
    info,
    token,
    text,
    traceOutput,
}: {
    info: Info;
    text: string;
    token: FullToken;
    traceOutput: TraceOutput;
}) {
    const show = info.shows.find((s) => s.start === token.start);
    const [open, setOpen] = React.useState(false);
    if (!show) return null;
    const counts = show.items
        .filter((id) => traceOutput[id])
        .map((id) => traceOutput[id].values.length);
    if (!counts.length) return null;
    const minCount = counts.reduce((a, b) => Math.min(a, b));
    return (
        <span
            style={{
                display: 'inline-block',
                cursor: 'pointer',
                color: 'teal',
            }}
            onClick={() => setOpen(!open)}
        >
            {open ? '🔽 ' : '▶ '}
            {text}
            {open ? (
                <>
                    <br />
                    <div style={{display: 'inline-flex', flexWrap: 'wrap'}}>
                        {traceOutput[show.items[0]].values.slice(0, minCount).map((_, i) => (
                            <div key={i}>
                                <div
                                    style={{
                                        backgroundColor: 'black',
                                        padding: '4px 8px',
                                        borderRadius: 3,
                                        margin: 4,
                                    }}
                                >
                                    {i + 1}
                                </div>
                                <div style={{display: 'flex'}}>
                                    {renderWidgets(show, traceOutput, info, i)}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </span>
    );
}
function renderWidgets(
    show: {start: number; end: number; items: number[]},
    traceOutput: TraceOutput,
    info: Info,
    index: number,
): React.ReactNode {
    return show.items
        .filter((id) => traceOutput[id])
        .map((id, i) => (
            <div
                style={{
                    width: 100,
                    height: 100,
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    outline: '1px solid magenta',
                    margin: 4,
                }}
            >
                {info.expressions[id].type && widgets[info.expressions[id].type!.type] ? (
                    widgets[info.expressions[id].type!.type](
                        traceOutput[id].values[index],
                        null,
                        '100px',
                    )
                ) : (
                    <>
                        {info.expressions[id].type?.type || '[no type info]'}
                        {JSON.stringify(traceOutput[id].values[index])}
                    </>
                )}
            </div>
        ));
}
