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
        return null;
        // return (
        //     <div
        //         style={{
        //             display: 'inline-block',
        //             backgroundColor: 'red',
        //             width: 4,
        //             height: 4,
        //             margin: 1,
        //         }}
        //     />
        // );
    }
    return widgets[info.fn.meta.name](info.args, trace[id].values[0]);
};

type ByStart = {
    [key: number]: Array<{
        id: number;
        end: number;
    }>;
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
        ByStart,
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

        const byStart: ByStart = {};
        Object.keys(data).forEach((k) => {
            const start = data[+k].loc.start;
            byStart[start] = (byStart[start] || []).concat([
                { id: +k, end: data[+k].loc.end },
            ]);
        });
        Object.keys(byStart).forEach((start) => {
            byStart[+start].sort((a, b) => b.end - a.end);
        });
        return [data, byStart];
    }, [selected]);
    const [hover, setHover] = React.useState(null as null | number);
    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {fixtures.map((fix, i) => (
                    <div
                        key={i}
                        style={
                            selected === i
                                ? { outline: '1px solid magenta' }
                                : undefined
                        }
                        onClick={() => {
                            setSelected(i);
                            setHover(null);
                        }}
                    >
                        <svg width={300} height={300}>
                            {renderInput(fix.input)}
                            {renderOutput(fix.output, fix.input)}
                        </svg>
                    </div>
                ))}
            </div>
            <div style={{ position: 'relative' }}>
                <Highlight {...defaultProps} code={source} language="tsx">
                    {({
                        className,
                        style,
                        tokens: lines,
                        getLineProps,
                        getTokenProps,
                    }) => {
                        // let at = 0;
                        const organized = organize2(
                            lines,
                            byStart,
                            traceOutput,
                        );
                        return (
                            <pre
                                className={className}
                                style={{
                                    ...style,
                                    whiteSpace: 'pre-wrap',
                                    fontSize: 20,
                                }}
                            >
                                {renderFull(
                                    organized,
                                    getTokenProps,
                                    byStart,
                                    traceOutput!,
                                    '',
                                    (id) => setHover(id),
                                )}
                                {/* {organized.map(({ line, broken }, i) => {
                                    const res = (
                                        <React.Fragment
                                            key={i}
                                            // {...getLineProps({ line, key: i })}
                                        >
                                            {broken.map((token, i) =>
                                                renderFull(
                                                    token,
                                                    getTokenProps,
                                                    byStart,
                                                    traceOutput!,
                                                    i + '',
                                                    (id) => setHover(id),
                                                ),
                                            )}
                                        </React.Fragment>
                                    );
                                    // at += 1;
                                    return res;
                                })} */}
                            </pre>
                        );
                    }}
                </Highlight>
                {hover != null && traceOutput != null ? (
                    <div
                        style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            position: 'absolute',
                            right: 20,
                            top: 20,
                            backgroundColor: 'white',
                        }}
                    >
                        <ShowValues
                            values={traceOutput[hover].values.map((f) =>
                                typeof f === 'function' ? f.meta : f,
                            )}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const ShowValues = ({ values }: { values: Array<any> }) => {
    const [selected, setSelected] = React.useState(0);
    return (
        <div>
            {values.length > 1 ? (
                <div>
                    <button onClick={() => setSelected(selected - 1)}>
                        &lt;
                    </button>
                    {selected + 1}
                    <button onClick={() => setSelected(selected + 1)}>
                        &gt;
                    </button>
                </div>
            ) : null}
            {JSON.stringify(values[selected])}
        </div>
    );
};

const renderFull = (
    token: FullToken,
    getTokenProps: Highlight['getTokenProps'],
    byStart: ByStart,
    traceOutput: TraceOutput,
    key: string,
    onHover: (i: number) => void,
) => {
    return (
        <span
            key={key}
            data-at={token.start}
            data-end={token.end}
            data-id={token.id}
            data-widgets={JSON.stringify(token.widgets)}
            className={token.id != null ? 'hover-underline' : ''}
            style={
                Array.isArray(token.content) && key !== ''
                    ? {
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          //   outline: '2px solid rgba(0,0,0,1)',
                          //   margin: 4,
                      }
                    : undefined
            }
            // style={
            //     token.id
            //         ? { textDecoration: 'underline', backgroundColor: '#aaa' }
            //         : undefined
            // }
            onMouseOver={
                token.id != null
                    ? (evt) => {
                          evt.stopPropagation();
                          onHover(token.id!);
                      }
                    : undefined
            }
        >
            {token.widgets.map((id) => getWidget(id.id, traceOutput))}
            {Array.isArray(token.content) ? (
                token.content.map((inner, i) =>
                    renderFull(
                        inner,
                        getTokenProps,
                        byStart,
                        traceOutput,
                        key + ':' + i,
                        onHover,
                    ),
                )
            ) : (
                <span {...getTokenProps({ token: token.content })} />
            )}
        </span>
    );
};

type Token = Parameters<Highlight['getTokenProps']>[0]['token'];
type FullToken = {
    content: Token | Array<FullToken>;
    id: null | number;
    start: number;
    end: number;
    widgets: Array<Item>;
    parent: FullToken | null;
};
type Item = {
    id: number;
    start: number;
    end: number;
};

export const organize2 = (
    lines: Array<Array<Token>>,
    byStart: ByStart,
    traceOutput: TraceOutput | null,
): FullToken => {
    // first split tokens
    // then annotate with ides
    const tokens: Array<Token & { at: number }> = [];
    let at = -1;
    lines.forEach((line) => {
        line.forEach((token) => {
            if (!token.content.length) {
                console.log('empty token?');
                return;
            }
            let content = token.content;
            const m = content.match(/^\s+/);
            if (m && m[0].length < content.length) {
                tokens.push({ ...token, content: m[0], at });
                content = content.slice(m[0].length);
                at += m[0].length;
            }
            const end = content.match(/\s+$/);
            if (end && end[0].length < content.length) {
                tokens.push({
                    ...token,
                    content: content.slice(0, -end[0].length),
                    at,
                });
                at += content.length - end[0].length;
                tokens.push({ ...token, content: end[0], at });
                at += end[0].length;
            } else {
                tokens.push({ ...token, content, at });
                at += content.length;
            }
        });
        tokens.push({ content: '\n', types: [], at });
        at += 1;
    });

    const root: FullToken = {
        content: [],
        id: null,
        start: 0,
        end: at,
        widgets: [],
        parent: null,
    };

    let current = root;

    const addTokens = (before: number) => {
        while (
            tokens.length &&
            tokens[0].at < current.end &&
            tokens[0].at < before
        ) {
            (current.content as Array<FullToken>).push({
                id: null,
                start: tokens[0].at,
                end: tokens[0].at + tokens[0].content.length,
                widgets: [],
                content: tokens.shift()!,
                parent: current,
            });
        }
    };

    Object.keys(traceOutput || {})
        .sort((a, b) => {
            const ka = traceOutput![+a];
            const kb = traceOutput![+b];
            return ka.loc.start === kb.loc.start
                ? kb.loc.end - ka.loc.end
                : ka.loc.start - kb.loc.start;
        })
        .forEach((k) => {
            const v = traceOutput![+k];
            while (v.loc.start >= current.end) {
                addTokens(current.end);
                current = current.parent!;
            }
            addTokens(v.loc.start);
            const token: FullToken = {
                content: [],
                id: +k,
                start: v.loc.start,
                end: v.loc.end,
                widgets: [{ id: +k, start: v.loc.start, end: v.loc.end }],
                parent: current,
            };
            (current.content as Array<FullToken>).push(token);
            current = token;
            // addTokens(v.loc.end);
        });
    while (current !== root) {
        current = current.parent!;
        addTokens(root.end);
    }
    addTokens(root.end);
    console.log(root);

    /*

	so there's this recursive structure
	and at each token
	I need to know the list of active whatsits

	start,
	end,
	ids,
	children: [...]

	*/

    // tokens.forEach((token) => {
    //     if (byStart[token.at]) {
    //     }
    // });

    // // we need recursion probably?

    // // consume ... things ...
    // // waht about multiline? I don't really care about line highlighting.
    // // so maybe we just do inline-block everything, with newlines. let's do it.

    // // let at = 0;

    // // let current: Array<Item> = [];
    // const advance = (tok: Token) => {
    //     const num = tok.content.length;
    //     if (current.some((t) => t.end <= at + num)) {
    //         current = current.filter((t) => t.end > at + num);
    //     }

    //     for (let i = 0; i < num; i++) {
    //         at += 1;
    //         if (byStart[at - 1]) {
    //             current.push(
    //                 ...byStart[at - 1].map((m) => ({ ...m, start: at })),
    //             );
    //             // added.push(...byStart[at].map((m) => ({ ...m, start: at })));
    //         }
    //     }

    //     // at += num;
    //     return {
    //         content: tok,
    //         at: at - num,
    //         id: null,
    //         widgets: current.filter((c) => c.start === at - num),
    //     };
    // };

    // return split.map((line) => ({
    //     broken: line.map((tok) => advance(tok)),
    //     line,
    // }));
    return root;
};

// export const organizeTokens = (
//     lines: Array<Array<Token>>,
//     byStart: ByStart,
// ) => {
//     let current: Array<Item> = [];
//     let at = -1;
//     let added: Array<Item> = [];

//     const advance = (n: number) => {
//         if (current.some((t) => t.end <= at + n)) {
//             current = current.filter((t) => t.end > at + n);
//         }
//         let added = [];
//         for (let i = 0; i < n; i++) {
//             at += 1;
//             if (byStart[at]) {
//                 current.push(...byStart[at].map((m) => ({ ...m, start: at })));
//                 added.push(...byStart[at].map((m) => ({ ...m, start: at })));
//             }
//         }
//         current.sort((a, b) => a.end - b.end);
//         return added;
//     };

//     added = advance(0);

//     return lines.map((line, i) => {
//         const broken: Array<FullToken> = [];
//         line.forEach((token) => {
//             if (!token.content.length) {
//                 console.log('empty token?');
//                 return;
//             }
//             let content = token.content;
//             const m = content.match(/^\s+/);
//             if (m && m[0].length < content.length) {
//                 broken.push({
//                     at,
//                     content: {
//                         ...token,
//                         content: m[0],
//                     },
//                     id: current.length ? current[0].id : null,
//                     widgets: added,
//                 });
//                 added = advance(m[0].length);
//                 content = content.slice(m[0].length);
//             }
//             broken.push({
//                 at,
//                 content: { ...token, content },
//                 // id: current.length ? current[0].id : null,
//                 id: current.length ? current[0].id : null,
//                 widgets: added,
//             });
//             added = advance(content.length);
//         });
//         added = advance(1);
//         return { broken, line };
//     });
// };
