import * as React from 'react';
import { Fixture } from '../src/vest/types';
import { visuals, widgets } from './functionWidgets';
import { useInitialState } from '../src/rendering/SegmentEditor';
import { RenderCode } from './RenderCode';

import { RenderSidebar } from './RenderSidebar';
import { ShowValues } from './ShowValues';

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
    shows: Array<{ start: number; end: number; items: Array<number> }>;
    expressions: {
        [key: number]: {
            start: number;
            end: number;
            type?: {
                type: string;
                text: string;
                start: number;
                end: number;
                k: number;
                loc: string;
            };
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
export const colors: Array<string> = [];
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
			the babel transform! Either you need to add the '// \
            @trace' comment to it, or you haven't set up the babel transform \
			correctly.`,
        );
    }
    const source = annotatedRun.rawSource;
    const trace = annotatedRun.trace;
    const info = annotatedRun.traceInfo;
    // @ts-ignore
    window.annotated = annotatedRun;
    // console.log('window.annotated');

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
                        display: 'inline-block',
                        backgroundColor: '#000',
                        padding: '0 8px 8px',
                        marginTop: 4,
                        borderRadius: 3,
                    }}
                >
                    <span
                        style={{
                            fontSize: '70%',
                            color: 'white',
                        }}
                    >
                        Examples that hit this path:
                    </span>
                    <div
                        style={{
                            display: 'flex',
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
                                    marginRight: 4,
                                    marginTop: 4,
                                }}
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
                    setHover={(id) => {
                        if (
                            id != null &&
                            info.expressions[id] &&
                            info.expressions[id].type?.type === 'void'
                        ) {
                            return;
                        }
                        setHover(id);
                    }}
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
                        <RenderSidebar
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

                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                width: 300,
                            }}
                        >
                            {fixtures.map((fixture, idx) => (
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
                    <ShowValues
                        values={traceOutput[hover].values}
                        type={info.expressions[hover].type}
                    />
                    {getWidget(hover, traceOutput, '3em')}
                </div>
            ) : null}
        </div>
    );
};
