import * as React from 'react';
import { Fixture } from '../src/vest/types';
import Highlight, { defaultProps } from 'prism-react-renderer';
import { widgets } from './functionWidgets';

type Trace = <V>(
    value: V,
    id: number,
    start: number,
    end: number,
    call?: Array<number>,
) => V;
type TraceOutput = {
    [id: number]: {
        loc: {
            start: number;
            end: number;
        };
        values: Array<any>;
        call?: Array<number>;
    };
};

const getCallInfo = (id: number, trace: TraceOutput) => {
    if (!trace[id].call) {
        return;
    }
    const [fnid, ...args] = trace[id].call!;
    if (!trace[fnid] || args.some((id) => !trace[id])) {
        console.log('hm no fn info', id, trace[id].call);
        return null;
    }
    return {
        fn: trace[fnid].values[0],
        args: args.map((id) => trace[id].values[0]),
    };
};

const getWidget = (id: number, trace: TraceOutput) => {
    const info = getCallInfo(id, trace);
    if (!info || !info.fn.meta || !widgets[info.fn.meta.name]) {
        return '🔎';
    }
    return widgets[info.fn.meta.name](info.args, trace[id].values[0]);
};

export const Fixtures = <I, O>({
    fixtures,
    renderInput,
    renderOutput,
    source,
    trace,
}: {
    fixtures: Array<Fixture<I, O>>;
    renderInput: (i: I) => JSX.Element;
    renderOutput: (o: O, i: I) => JSX.Element;
    trace: (i: I, trace: Trace) => void;
    source: string;
}) => {
    console.log(typeof trace);
    const [selected, setSelected] = React.useState(null as null | number);
    const [traceOutput, byStart] = React.useMemo((): [
        TraceOutput | null,
        { [key: number]: Array<number> },
    ] => {
        if (selected === null) {
            return [null, {}];
        }

        const data: TraceOutput = [];
        trace(fixtures[selected].input, (value, id, start, end, call) => {
            if (!data[id]) {
                data[id] = { loc: { start, end }, values: [value], call };
            } else {
                data[id].values.push(value);
            }
            return value;
        });
        const byStart: { [key: number]: Array<number> } = {};
        Object.keys(data).forEach((k) => {
            const start = data[+k].loc.start;
            byStart[start] = (byStart[start] || []).concat([+k]);
        });
        Object.keys(byStart).forEach((start) => {
            byStart[+start].sort((a, b) => data[b].loc.end - data[a].loc.end);
        });
        return [data, byStart];
    }, [selected]);
    const [hover, setHover] = React.useState(null as null | number);
    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {fixtures.map((fix, i) => (
                    <div key={i} onClick={() => setSelected(i)}>
                        <svg width={300} height={300}>
                            {renderInput(fix.input)}
                            {renderOutput(fix.output, fix.input)}
                        </svg>
                    </div>
                ))}
            </div>
            <div>
                <Highlight {...defaultProps} code={source} language="tsx">
                    {({
                        className,
                        style,
                        tokens,
                        getLineProps,
                        getTokenProps,
                    }) => {
                        let at = 0;
                        return (
                            <pre className={className} style={style}>
                                {tokens.map((line, i) => {
                                    const broken: typeof line = [];
                                    line.forEach((token) => {
                                        const m = token.content.match(/^\s+/);
                                        if (
                                            m &&
                                            m[0].length < token.content.length
                                        ) {
                                            broken.push({
                                                ...token,
                                                content: m[0],
                                            });
                                            broken.push({
                                                ...token,
                                                content: token.content.slice(
                                                    m[0].length,
                                                ),
                                            });
                                        } else {
                                            broken.push(token);
                                        }
                                    });
                                    // at += 1; // newline
                                    const res = (
                                        <div
                                            {...getLineProps({ line, key: i })}
                                        >
                                            {broken.map((token, key) => {
                                                const rendered = (
                                                    <span
                                                        {...getTokenProps({
                                                            token,
                                                            key,
                                                        })}
                                                    />
                                                );
                                                const start = at - 1;
                                                at += token.content.length;
                                                if (byStart[start]) {
                                                    return (
                                                        <React.Fragment
                                                            key={key + 'ok'}
                                                        >
                                                            {byStart[start].map(
                                                                (id, i) => {
                                                                    if (
                                                                        !traceOutput ||
                                                                        !traceOutput[
                                                                            id
                                                                        ]
                                                                    ) {
                                                                        return;
                                                                    }
                                                                    return (
                                                                        <span
                                                                            key={
                                                                                id
                                                                            }
                                                                            onMouseEnter={() => {
                                                                                setHover(
                                                                                    id,
                                                                                );
                                                                            }}
                                                                        >
                                                                            {getWidget(
                                                                                id,
                                                                                traceOutput,
                                                                            )}
                                                                        </span>
                                                                    );
                                                                },
                                                            )}
                                                            {rendered}
                                                        </React.Fragment>
                                                    );
                                                } else {
                                                    return rendered;
                                                }
                                            })}
                                        </div>
                                    );
                                    at += 1;
                                    return res;
                                })}
                            </pre>
                        );
                    }}
                </Highlight>
            </div>
            {hover != null && traceOutput != null ? (
                <div
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                >
                    {JSON.stringify(
                        traceOutput[hover].values.map((f) =>
                            typeof f === 'function' ? f.meta : f,
                        ),
                        null,
                        2,
                    )}
                    {traceOutput[hover].call
                        ? '\n' +
                          JSON.stringify(
                              traceOutput[hover].call?.map(
                                  (id) => traceOutput[id].values,
                              ),
                          )
                        : null}
                </div>
            ) : null}
        </div>
    );
};
