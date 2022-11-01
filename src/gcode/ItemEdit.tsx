import React, { useState } from 'react';
import { paletteColor } from '../editor/RenderPath';
import { makeDepths, pxToMM } from './generateGcode';
import { GCodePath, State } from '../types';
import { FillColors, LineColors } from './GCodeEditor';
import { Int } from '../editor/Forms';
import {
    IconEye,
    IconEyeInvisible,
    IconSpeedtest,
    IconVerticalAlignBottom,
    IconVerticalAlignMiddle,
    IconVerticalAlignTop,
} from '../icons/Icon';

const ColorsSelect = ({
    value,
    colors,
    onChange,
}: {
    value?: string;
    colors: { key: string; color: string; title: string }[];
    onChange: (key: string) => void;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
                style={{
                    backgroundColor:
                        colors.find((c) => c.key === value)?.color ?? 'magenta',
                    width: 20,
                    height: 20,
                    border: '1px solid black',
                    cursor: 'pointer',
                }}
                onClick={() => setShow(!show)}
            />
            {show && (
                <div
                    style={{
                        padding: 8,
                        position: 'absolute',
                        zIndex: 100,
                        top: 20,
                        left: 0,
                        backgroundColor: '#222',
                        border: '2px solid white',
                    }}
                >
                    {colors.map((c) => (
                        <div
                            key={c.key}
                            style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={() => (setShow(false), onChange(c.key))}
                        >
                            <div
                                style={{
                                    backgroundColor: c.color,
                                    display: 'inline-block',
                                    width: 20,
                                    height: 20,
                                    marginRight: 4,
                                }}
                            />
                            <span style={{ whiteSpace: 'nowrap' }}>
                                {c.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ItemEdit = ({
    item,
    onChange,
    colors,
    state,
}: {
    item: GCodePath;
    onChange: (item: GCodePath) => void;
    colors: { line: LineColors; fill: FillColors };
    state: State;
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    const current = edited ?? item;
    const selected = colors.line[current.color];

    return (
        <>
            <button
                onClick={() => onChange({ ...item, disabled: !item.disabled })}
                style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                }}
            >
                {item.disabled ? <IconEyeInvisible /> : <IconEye />}
            </button>
            <ColorsSelect
                onChange={(color) => setEdited({ ...current, color })}
                value={current.color}
                colors={Object.keys(colors.line)
                    .map((c) => ({
                        key: c,
                        color: paletteColor(
                            state.palettes[state.activePalette],
                            colors.line[c].color,
                        )!,
                        title: `${pxToMM(
                            colors.line[c].width! / 100,
                            state.meta.ppi,
                        ).toFixed(2)} mm (${colors.line[c].count} paths)`,
                    }))
                    .concat(
                        Object.keys(colors.fill).map((c) => ({
                            key: c,
                            color: paletteColor(
                                state.palettes[state.activePalette],
                                colors.fill[c].color,
                                colors.fill[c].lighten,
                            )!,
                            title: `${colors.fill[c].count} paths, pocket`,
                        })),
                    )}
            />
            {selected?.width ? (
                <span style={{ fontSize: '80%', marginLeft: 8 }}>
                    {pxToMM(selected.width / 100, state.meta.ppi).toFixed(2) +
                        'mm'}
                </span>
            ) : (
                <span />
            )}
            <span style={{ marginRight: 8 }} />
            <IconSpeedtest />
            <Float
                style={{
                    marginLeft: -8,
                    fontSize: '80%',
                }}
                value={current.speed}
                placeholder="Speed"
                onChange={(speed) =>
                    speed != null ? setEdited({ ...current, speed }) : null
                }
            />
            <ButtonToggle
                button={(_, toggle) => (
                    <IconVerticalAlignTop onClick={toggle} />
                )}
                startOpen={current.start != null && current.start !== 0}
                body={
                    <Float
                        style={{
                            // marginRight: 16,
                            marginLeft: -8,
                            fontSize: '80%',
                            width: 30,
                        }}
                        value={current.start ?? 0}
                        placeholder="Start"
                        onChange={(start) =>
                            start != null
                                ? setEdited({ ...current, start })
                                : null
                        }
                    />
                }
            />
            <IconVerticalAlignBottom />
            <Float
                style={{
                    // marginRight: 16,
                    marginLeft: -8,
                    fontSize: '80%',
                    width: 30,
                }}
                value={current.depth}
                // placeholder="Depth"
                onChange={(depth) =>
                    depth != null ? setEdited({ ...current, depth }) : null
                }
            />
            <ButtonToggle
                button={(_, toggle) => (
                    <IconVerticalAlignMiddle onClick={toggle} />
                )}
                startOpen={current.passDepth != null && current.passDepth !== 0}
                body={
                    <span>
                        <Float
                            style={{
                                marginRight: 4,
                                marginLeft: -4,
                                fontSize: '80%',
                                width: 30,
                            }}
                            value={current.passDepth}
                            // placeholder="Depth"
                            onChange={(passDepth) =>
                                setEdited({ ...current, passDepth })
                            }
                        />
                        <span
                            style={{
                                fontSize: '50%',
                                marginRight: 8,
                            }}
                        >
                            (
                            {
                                makeDepths(
                                    current.start,
                                    current.depth,
                                    current.passDepth,
                                ).length
                            }{' '}
                            p)
                        </span>
                    </span>
                }
            />
            {selected?.width ? (
                current.tabs ? (
                    <Tabs
                        tabs={current.tabs}
                        onChange={(tabs) => setEdited({ ...current, tabs })}
                    />
                ) : (
                    <button
                        onClick={() =>
                            setEdited({
                                ...current,
                                tabs: { count: 3, depth: 1, width: 3 },
                            })
                        }
                    >
                        Tabs
                    </button>
                )
            ) : (
                <span />
            )}
            {edited != null ? (
                <button
                    onClick={() => {
                        onChange(edited);
                        setEdited(null);
                    }}
                >
                    Save
                </button>
            ) : (
                <span />
            )}
        </>
    );
};

type Tabs = NonNullable<GCodePath['tabs']>;
const Tabs = ({
    tabs,
    onChange,
}: {
    tabs: Tabs;
    onChange: (tabs: Tabs) => void;
}) => {
    return (
        <span>
            <span style={{ fontSize: '50%' }}>Tabs</span>
            <Int
                value={tabs.count}
                placeholder={'Count'}
                onChange={(count) =>
                    count != null ? onChange({ ...tabs, count }) : null
                }
            />
            <Float
                style={{
                    marginRight: 4,
                    marginLeft: 4,
                    fontSize: '80%',
                    width: 30,
                }}
                value={tabs.depth}
                placeholder="Depth"
                onChange={(depth) =>
                    depth != null ? onChange({ ...tabs, depth }) : null
                }
            />
            <Float
                style={{
                    marginRight: 4,
                    marginLeft: 4,
                    fontSize: '80%',
                    width: 30,
                }}
                value={tabs.width}
                placeholder="Width"
                onChange={(width) =>
                    width != null ? onChange({ ...tabs, width }) : null
                }
            />
        </span>
    );
};

export const Float = ({
    value,
    onChange,
    placeholder,
    style,
}: {
    value?: number;
    onChange: (v?: number) => unknown;
    placeholder?: string;
    style?: React.CSSProperties;
}) => {
    let [text, setText] = React.useState(null as null | string);
    return (
        <input
            value={text ?? value ?? ''}
            placeholder={placeholder}
            onChange={(evt) => {
                setText(evt.target.value);
                if (!evt.target.value.trim().length) {
                    return onChange(undefined);
                }
                const value = +evt.target.value;
                if (!isNaN(value)) {
                    onChange(value);
                }
            }}
            onBlur={() => setText(null)}
            style={{
                width: 40,
                background: 'transparent',
                color: 'inherit',
                border: 'none',
                padding: 0,
                textAlign: 'center',
                borderBottom: '1px solid #aaa',
                ...style,
            }}
        />
    );
};

const ButtonToggle = ({
    button,
    body,
    startOpen,
}: {
    button: (show: boolean, toggle: () => void) => JSX.Element;
    body: React.ReactNode;
    startOpen?: boolean;
}) => {
    const [show, setShow] = React.useState(!!startOpen);
    return (
        <>
            {button(show, () => setShow(!show))}
            {show ? body : <span />}
        </>
    );
};
