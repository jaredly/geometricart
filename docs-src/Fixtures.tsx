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
                overflow: 'hidden',
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
    docs: string | null;
    start: number;
    end: number;
    references: Array<{ id: number; loc: { start: number; end: number } }>;
};

const colorsRaw =
    '1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf';
// '8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f';
const colors: Array<string> = [];
for (let i = 0; i < colorsRaw.length; i += 6) {
    colors.push('#' + colorsRaw.slice(i, i + 6));
}

export const Fixtures = <I, O>({
    fixtures,
    Input,
    Output,
    source,
    editDelay,
    trace,
    info,
    run,
}: {
    fixtures: Array<Fixture<I, O>>;
    Input: (props: { input: I; onChange?: (input: I) => void }) => JSX.Element;
    Output: (props: { output: O; input: I }) => JSX.Element;
    editDelay?: number;
    trace: (i: I, trace: Trace) => O;
    info: Info;
    run: (i: I) => O;
    source: string;
}) => {
    const [selected, setSelected] = React.useState(fixtures[0]);
    const [output, traceOutput, byStart] = React.useMemo((): [
        O,
        TraceOutput,
        ByStart,
    ] => {
        const data: TraceOutput = {};
        const output = trace(selected.input, (value, id) => {
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
        return [output, data, byStart];
    }, [selected]);

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
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {fixtures.map((fix, i) => (
                    <div
                        key={i}
                        style={
                            selected === fix
                                ? {
                                      outline: '1px solid magenta',
                                      cursor: 'pointer',
                                  }
                                : { cursor: 'pointer' }
                        }
                        onClick={() => {
                            setSelected(fix);
                            setHover(null);
                        }}
                    >
                        <svg width={150} height={150} viewBox="0 0 300 300">
                            <Input input={fix.input} />
                            <Output output={run(fix.input)} input={fix.input} />
                        </svg>
                    </div>
                ))}
            </div>
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
                />
                <div>
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            padding: 8,
                        }}
                    >
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

function RenderMain<I, O>({
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
        input: I;
        onChange?: ((input: I) => void) | undefined;
    }) => JSX.Element;
    setSelected: React.Dispatch<React.SetStateAction<Fixture<I, O>>>;
    pins: { [key: number]: boolean };
    setPins: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
    setHover: React.Dispatch<React.SetStateAction<number | null>>;
    selected: Fixture<I, O>;
    Output: (props: { output: O; input: I }) => JSX.Element;
    output: O;
    run: (i: I) => O;
    hover: number | null;
    traceOutput: TraceOutput;
}) {
    const [edit, setEdit] = useInitialState(selected.input);
    const myOutput = React.useMemo(() => run(edit), [edit]);
    React.useEffect(() => {
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
                <Input onChange={setEdit} input={edit} />
                <Output input={edit} output={myOutput} />
                <g style={{ pointerEvents: 'none' }}>
                    {Object.keys(pins)
                        .filter((k) => pins[+k] && !!traceOutput[+k])
                        .map((k, i) => {
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
                                                (id) =>
                                                    traceOutput[id].values[0],
                                            ),
                                            hover.values[0],
                                        )}
                                    </g>
                                );
                            }
                        })}
                    {hover
                        ? ((hover) => {
                              if (!hover.call) {
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
                    display: 'flex',
                    flexWrap: 'wrap',
                    fontFamily: 'monospace',
                }}
            >
                {Object.keys(pins)
                    .filter((k) => pins[+k] && !!traceOutput[+k])
                    .map((k, i) => (
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
