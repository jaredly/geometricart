import * as React from 'react';
import { Fixture } from '../src/vest/types';
import { visuals, widgets } from './functionWidgets';
import { useInitialState } from '../src/rendering/SegmentEditor';
import { RenderCode } from './RenderCode';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type Trace = <V>(
    value: V,
    id: number,
    // start: number,
    // end: number,
    // call?: Array<number>,
) => V;
export type TraceOutput = {
    [id: number]: {
        loc: {
            start: number;
            end: number;
        };
        values: Array<any>;
        call?: { fn: number; args: Array<number> };
    };
};

const getCallInfo = (id: number, trace: TraceOutput) => {
    if (!trace[id] || !trace[id].call) {
        return;
    }
    const { fn: fnid, args } = trace[id].call!;
    if (fnid === -1) {
        return; // builtin probably
    }
    if (!trace[fnid] || args.some((id) => !trace[id])) {
        console.log('hm no fn info', id, trace[id].call);
        return null;
    }
    return {
        fn: trace[fnid].values[0],
        args: args.map((id) => trace[id].values[0]),
    };
};

// @ts-ignore
Math.cos.meta = { name: 'Math.cos' };

export const hasVisual = (id: number, trace: TraceOutput) => {
    const info = getCallInfo(id, trace);
    if (!info || !info.fn.meta) {
        return false;
    }
    return !!visuals[info.fn.meta.name] || !!widgets[info.fn.meta.name];
};

export const getWidget = (id: number, trace: TraceOutput, size: string) => {
    const info = getCallInfo(id, trace);
    if (!info || !info.fn.meta || !widgets[info.fn.meta.name]) {
        return null;
    }
    return (
        <span
            style={{
                width: size,
                height: size,
                display: 'inline-block',
            }}
            key={id}
        >
            {widgets[info.fn.meta.name](info.args, trace[id].values[0], size)}
        </span>
    );
};

export type ByStart = {
    [key: number]: Array<{
        id: number;
        end: number;
    }>;
};

export type Info = {
    comments: Array<{ value: string; start: number; end: number }>;
    expressions: {
        [key: number]: {
            start: number;
            end: number;
        };
    };
    calls: {
        [key: number]: {
            fn: number;
            args: Array<number>;
        };
    };
    examples: { [key: number]: { start: number; end: number } };
    docs: string | null;
    start: number;
    end: number;
    references: Array<{ id: number; loc: { start: number; end: number } }>;
};

const colorsRaw =
    '1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf';
const colors: Array<string> = [];
for (let i = 0; i < colorsRaw.length; i += 6) {
    colors.push('#' + colorsRaw.slice(i, i + 6));
}

export const Fixtures = <Fn extends (...args: any) => any>({
    fixtures,
    Input,
    Output,
    editDelay,
    run,
}: {
    fixtures: Array<Fixture<Fn>>;
    Input: (props: {
        input: Parameters<Fn>;
        onChange?: (input: Parameters<Fn>) => void;
        scale: number;
    }) => JSX.Element;
    Output: (props: {
        output: ReturnType<Fn>;
        input: Parameters<Fn>;
        scale: number;
    }) => JSX.Element;
    editDelay?: number;
    run: Fn;
}) => {
    // The func
    const annotatedRun = run as Fn & {
        trace: (trace: Trace, ...i: Parameters<Fn>) => ReturnType<Fn>;
        traceInfo: Info;
        rawSource: string;
    };
    if (
        typeof annotatedRun.trace !== 'function' ||
        typeof annotatedRun.rawSource !== 'string'
    ) {
        throw new Error(
            `The function you've passed in hasn't been annotated by \
			the babel transform! Either you need to add the '// @trace' \
			comment to it, or you haven't set up the babel transform \
			correctly.`,
        );
    }
    const source = annotatedRun.rawSource;
    const trace = annotatedRun.trace;
    const info = annotatedRun.traceInfo;

    const [selected, setSelected] = React.useState(fixtures[0]);
    const [output, traceOutput, byStart] = React.useMemo((): [
        ReturnType<Fn>,
        TraceOutput,
        ByStart,
    ] => {
        const data: TraceOutput = {};
        const output = trace((value, id) => {
            const { start, end } = info.expressions[id];
            if (!data[id]) {
                data[id] = {
                    loc: { start, end },
                    values: [value],
                    call: info.calls[id],
                };
            } else {
                data[id].values.push(value);
            }
            return value;
        }, ...selected.input);

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
        return [output, data, byStart];
    }, [selected]);

    const { examplesMatching, unmatchedFixtures } = React.useMemo(() => {
        const examplesMatching: { [key: string]: Array<number> } = {};
        Object.keys(info.examples).forEach((k) => (examplesMatching[+k] = []));

        const unmatchedFixtures: Array<number> = [];

        fixtures.forEach((fixture, i) => {
            let matched = false;
            trace((value, id) => {
                if (examplesMatching[id] && !examplesMatching[id].includes(i)) {
                    matched = true;
                    examplesMatching[id].push(i);
                }
                return value;
            }, ...fixture.input);
            if (!matched) {
                unmatchedFixtures.push(i);
            }
        });

        const rendered: { [key: number]: JSX.Element } = {};

        Object.keys(examplesMatching).forEach((k) => {
            rendered[+k] = (
                <div
                    style={{
                        display: 'inline-flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                    }}
                    onMouseOver={(evt) => evt.stopPropagation()}
                >
                    {examplesMatching[+k].map((idx) => (
                        <div
                            key={idx}
                            style={{
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                margin: 4,
                            }}
                            onClick={() => {
                                setSelected(fixtures[idx]);
                                setHover(null);
                            }}
                        >
                            <svg width={50} height={50} viewBox="0 0 300 300">
                                <Input scale={6} input={fixtures[idx].input} />
                                <Output
                                    output={run(...fixtures[idx].input)}
                                    input={fixtures[idx].input}
                                    scale={6}
                                />
                            </svg>
                        </div>
                    ))}
                </div>
            );
        });

        return { examplesMatching: rendered, unmatchedFixtures };
    }, [fixtures, trace, info.examples]);

    const [hover, setHover] = React.useState(null as null | number);
    const [pins, setPins] = React.useState({} as { [key: number]: boolean });
    const [cursor, setCursor] = React.useState({ x: 0, y: 0 });
    React.useEffect(() => {
        const fn = (evt: MouseEvent) => {
            setCursor({ x: evt.clientX, y: evt.clientY });
        };
        document.addEventListener('mousemove', fn);
        return () => document.removeEventListener('mousemove', fn);
    }, []);

    return (
        <div style={{ marginBottom: 16 }}>
            <div
                style={{
                    maxWidth: 1200,
                    display: 'flex',
                    backgroundColor: 'rgb(42, 39, 52)',
                }}
            >
                <RenderCode
                    source={source}
                    byStart={byStart}
                    traceOutput={traceOutput}
                    pins={pins}
                    setPins={setPins}
                    info={info}
                    hover={hover}
                    setHover={setHover}
                    examplesMatching={examplesMatching}
                />
                <div>
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            padding: 8,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                width: 300,
                            }}
                        >
                            {unmatchedFixtures.map((idx) => (
                                <div
                                    key={idx}
                                    style={
                                        selected === fixtures[idx]
                                            ? {
                                                  outline: '1px solid magenta',
                                                  cursor: 'pointer',
                                              }
                                            : { cursor: 'pointer' }
                                    }
                                    onClick={() => {
                                        setSelected(fixtures[idx]);
                                        setHover(null);
                                    }}
                                >
                                    <svg
                                        width={50}
                                        height={50}
                                        viewBox="0 0 300 300"
                                    >
                                        <Input
                                            scale={6}
                                            input={fixtures[idx].input}
                                        />
                                        <Output
                                            output={run(...fixtures[idx].input)}
                                            input={fixtures[idx].input}
                                            scale={6}
                                        />
                                    </svg>
                                </div>
                            ))}
                        </div>

                        <RenderMain
                            editDelay={editDelay}
                            pins={pins}
                            setHover={setHover}
                            setPins={setPins}
                            run={run}
                            Input={Input}
                            setSelected={setSelected}
                            selected={selected}
                            Output={Output}
                            output={output}
                            hover={hover}
                            traceOutput={traceOutput}
                        />
                    </div>
                </div>
            </div>
            {hover != null ? (
                <div
                    style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        position: 'fixed',
                        left: cursor.x + 8,
                        top: cursor.y + 16,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        color: 'white',
                        padding: 4,
                    }}
                >
                    <ShowValues values={traceOutput[hover].values} />
                    {getWidget(hover, traceOutput, '3em')}
                </div>
            ) : null}
        </div>
    );
};

const ShowValues = ({ values }: { values: Array<any> }) => {
    const v = values[0];
    if (typeof v === 'function' && v.meta && v.meta.comment) {
        const arc: Array<{ name: string; comment?: string }> =
            v.meta.argComments;
        return (
            <div
                style={{
                    padding: 16,
                    fontFamily: 'system-ui',
                }}
            >
                {arc.some(Boolean) ? (
                    <div
                        style={{
                            marginBottom: '1em',
                            padding: '8px 16px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                        }}
                    >
                        <code>
                            {v.meta.name}({arc.map((c) => c.name).join(', ')})
                        </code>
                    </div>
                ) : null}
                <ReactMarkdown
                    children={v.meta.comment.replace(/^\s*\*/gm, '')}
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    className="md"
                />
                {arc.some((c) => c && c.comment) ? (
                    <>
                        <h4 style={{ marginTop: '1em', marginBottom: '.5em' }}>
                            Arguments
                        </h4>
                        <table>
                            <tbody>
                                {arc.map((arg) => (
                                    <tr>
                                        <td
                                            style={{
                                                paddingRight: 8,
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            {arg.name}
                                        </td>
                                        <td>
                                            {arg.comment ? (
                                                <ReactMarkdown
                                                    children={arg.comment}
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[
                                                        rehypeKatex,
                                                    ]}
                                                    className="md"
                                                />
                                            ) : (
                                                'No documentation'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : null}
            </div>
        );
    }
    return (
        <div style={{ whiteSpace: 'pre' }}>
            {typeof v === 'function' && v.meta
                ? `function ${v.meta.name}\n${v.meta.comment ?? ''}`
                : typeof v === 'number'
                ? v.toFixed(2)
                : JSON.stringify(v, (k, v) =>
                      typeof v === 'number' ? Math.round(v * 100) / 100 : v,
                  )}
        </div>
    );
};

function RenderMain<Fn extends (...args: any) => any>({
    Input,
    setSelected,
    selected,
    Output,
    output,
    hover,
    traceOutput,
    editDelay,
    run,
    pins,
    setPins,
    setHover,
}: {
    editDelay?: number;
    Input: (props: {
        input: Parameters<Fn>;
        onChange?: ((input: Parameters<Fn>) => void) | undefined;
        scale: number;
    }) => JSX.Element;
    setSelected: React.Dispatch<React.SetStateAction<Fixture<Fn>>>;
    pins: { [key: number]: boolean };
    setPins: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
    setHover: React.Dispatch<React.SetStateAction<number | null>>;
    selected: Fixture<Fn>;
    Output: (props: {
        output: ReturnType<Fn>;
        input: Parameters<Fn>;
        scale: number;
    }) => JSX.Element;
    output: ReturnType<Fn>;
    run: Fn;
    hover: number | null;
    traceOutput: TraceOutput;
}) {
    const [edit, setEdit] = useInitialState(selected.input);
    const [showAll, setShowAll] = React.useState(false);
    const myOutput = React.useMemo(() => run(...edit), [edit]);
    React.useEffect(() => {
        if (edit === selected.input) {
            return;
        }
        if (editDelay) {
            const tid = setTimeout(() => {
                setSelected((s) => ({ ...s, input: edit }));
            }, editDelay);
            return () => clearTimeout(tid);
        }
        if (edit !== selected.input) {
            setSelected((s) => ({ ...s, input: edit }));
        }
    }, [edit]);
    return (
        <div style={{ width: 300 }}>
            <svg
                width={300}
                height={300}
                viewBox="0 0 300 300"
                style={{
                    backgroundColor: 'white',
                }}
            >
                <Input onChange={setEdit} input={edit} scale={1} />
                <Output input={edit} output={myOutput} scale={1} />
                <g style={{ pointerEvents: 'none' }}>
                    {(showAll
                        ? Object.keys(traceOutput).filter((k) =>
                              hasVisual(+k, traceOutput),
                          )
                        : Object.keys(pins).filter(
                              (k) => pins[+k] && !!traceOutput[+k],
                          )
                    ).map((k, i) => {
                        const hover = traceOutput[+k];
                        if (!hover.call) {
                            return;
                        }
                        const name =
                            traceOutput[hover.call.fn].values[0].meta.name;
                        if (visuals[name]) {
                            return (
                                <g
                                    key={k}
                                    style={{
                                        color: colors[i % colors.length],
                                    }}
                                >
                                    {visuals[name](
                                        hover.call.args.map(
                                            (id) => traceOutput[id].values[0],
                                        ),
                                        hover.values[0],
                                    )}
                                </g>
                            );
                        }
                    })}
                    {hover
                        ? ((hover) => {
                              if (!hover.call || !traceOutput[hover.call.fn]) {
                                  return;
                              }
                              const name =
                                  traceOutput[hover.call.fn].values[0].meta
                                      ?.name;
                              if (name && visuals[name]) {
                                  return visuals[name](
                                      hover.call.args.map(
                                          (id) => traceOutput[id].values[0],
                                      ),
                                      hover.values[0],
                                  );
                              }
                          })(traceOutput[hover])
                        : null}
                </g>
            </svg>
            <div
                style={{
                    color: 'white',
                    cursor: 'pointer',
                    fontFamily: 'system-ui',
                }}
                onClick={() => setShowAll(!showAll)}
            >
                <input type="checkbox" checked={showAll} onChange={() => {}} />
                Show all annotations
            </div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    fontFamily: 'monospace',
                }}
            >
                {(showAll
                    ? Object.keys(traceOutput).filter((k) =>
                          hasVisual(+k, traceOutput),
                      )
                    : Object.keys(pins).filter(
                          (k) => pins[+k] && !!traceOutput[+k],
                      )
                ).map((k, i) => (
                    <div
                        onMouseOut={() => {
                            setHover(null);
                        }}
                        onMouseOver={() => {
                            setHover(+k);
                        }}
                        onClick={() => {
                            setPins({ ...pins, [+k]: false });
                            setHover(null);
                        }}
                        style={{
                            cursor: 'pointer',
                            margin: 8,
                            color: colors[i % colors.length],
                            borderBottom: '2px solid currentColor',
                            paddingBottom: 4,
                        }}
                        key={k}
                    >
                        {getWidget(+k, traceOutput, '3em')}
                    </div>
                ))}
            </div>
        </div>
    );
}
