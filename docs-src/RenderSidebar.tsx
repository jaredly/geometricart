import * as React from 'react';
import { useInitialState } from '../src/rendering/SegmentEditor';
import { Fixture } from '../src/vest/types';
import { colors, getWidget, hasVisual, TraceOutput } from './Fixtures';
import { visuals } from './functionWidgets';

export function RenderSidebar<Fn extends (...args: any) => any>({
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
    const myOutput = React.useMemo(() => run(...(edit as any)), [edit]);
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
