import React, {useEffect, useState} from 'react';
import {paletteColor} from '../editor/RenderPath';
import {makeDepths} from './generateGcode';
import {pxToMM} from './pxToMM';
import {GCodePath, State} from '../types';
import {FillColors, LineColors} from './GCodeEditor';
import {
    CheckmarkIcon,
    IconAngleAcute,
    IconArrowAutofitWidth,
    IconEye,
    IconEyeInvisible,
    IconSpeedtest,
    IconTabUnselected,
    IconUndo,
    IconVerticalAlignBottom,
    IconVerticalAlignMiddle,
    IconVerticalAlignTop,
} from '../icons/Icon';
import {Tooltip} from '../utils/Tooltip';

const ColorsSelect = ({
    value,
    colors,
    onChange,
}: {
    value?: string;
    colors: {key: string; color: string; title: string}[];
    onChange: (key: string) => void;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div style={{position: 'relative', display: 'inline-block'}}>
            <div
                style={{
                    backgroundColor: colors.find((c) => c.key === value)?.color ?? 'magenta',
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
                            style={{whiteSpace: 'nowrap', cursor: 'pointer'}}
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
                            <span style={{whiteSpace: 'nowrap'}}>{c.title}</span>
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
    colors: {line: LineColors; fill: FillColors};
    state: State;
}) => {
    const [edited, setEdited] = useState(null as null | GCodePath);
    const current = edited ?? item;
    const selected = colors.line[current.color];

    return (
        <div
            style={{
                display: 'contents',
                color: item.disabled ? '#777' : 'white',
            }}
        >
            <button
                onClick={() => onChange({...item, disabled: !item.disabled})}
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
                onChange={(color) => setEdited({...current, color})}
                value={current.color}
                colors={Object.keys(colors.line)
                    .map((c) => ({
                        key: c,
                        color: paletteColor(state.palette, colors.line[c].color)!,
                        title: `${pxToMM(colors.line[c].width! / 100, state.meta.ppi).toFixed(
                            2,
                        )} mm (${colors.line[c].count} paths)`,
                    }))
                    .concat(
                        Object.keys(colors.fill).map((c) => ({
                            key: c,
                            color: paletteColor(
                                state.palette,
                                colors.fill[c].color,
                                colors.fill[c].lighten,
                            )!,
                            title: `${colors.fill[c].count} paths, pocket`,
                        })),
                    )}
            />
            {selected?.width ? (
                <span style={{fontSize: '80%', marginLeft: 8}}>
                    {pxToMM(selected.width / 100, state.meta.ppi).toFixed(2) + 'mm'}
                </span>
            ) : (
                <ButtonToggle
                    button={(_, toggle) => <IconArrowAutofitWidth onClick={toggle} />}
                    startOpen
                    body={
                        <Float
                            style={{
                                marginLeft: -8,
                                fontSize: '80%',
                            }}
                            value={current.diameter}
                            onChange={(diameter) =>
                                diameter != null ? setEdited({...current, diameter}) : null
                            }
                        />
                    }
                />
            )}
            <span style={{marginRight: 8}} />
            <IconSpeedtest />
            <Float
                style={{
                    marginLeft: -8,
                    fontSize: '80%',
                }}
                value={current.speed}
                placeholder="Speed"
                onChange={(speed) => (speed != null ? setEdited({...current, speed}) : null)}
            />
            <ButtonToggle
                button={(_, toggle) => <IconVerticalAlignTop onClick={toggle} />}
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
                            start != null ? setEdited({...current, start}) : null
                        }
                    />
                }
            />
            <IconVerticalAlignBottom
                style={{
                    color: current.vbitAngle ? '#a77' : 'inherit',
                }}
            />
            <Tooltip
                text={
                    current.vbitAngle
                        ? `Depth is auto-calculated based on width & vbit angle`
                        : null
                }
            >
                <Float
                    style={{
                        marginLeft: -8,
                        fontSize: '80%',
                        width: 30,
                        color: current.vbitAngle ? '#a77' : 'inherit',
                    }}
                    value={current.depth}
                    // placeholder="Depth"
                    onChange={(depth) => (depth != null ? setEdited({...current, depth}) : null)}
                />
            </Tooltip>
            <ButtonToggle
                button={(_, toggle) => <IconVerticalAlignMiddle onClick={toggle} />}
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
                            onChange={(passDepth) => setEdited({...current, passDepth})}
                        />
                        <span
                            style={{
                                fontSize: '50%',
                                marginRight: 8,
                            }}
                        >
                            ({makeDepths(current.start, current.depth, current.passDepth).length} p)
                        </span>
                    </span>
                }
            />
            {selected?.width ? (
                <ButtonToggle
                    button={(_, toggle) => <IconAngleAcute onClick={toggle} />}
                    startOpen={item.vbitAngle != null}
                    body={
                        <Float
                            style={{
                                marginRight: 4,
                                marginLeft: -4,
                                fontSize: '80%',
                                width: 30,
                            }}
                            value={current.vbitAngle}
                            onChange={(vbitAngle) => setEdited({...current, vbitAngle})}
                        />
                    }
                />
            ) : (
                <span />
            )}
            {selected?.width ? (
                <ButtonToggle
                    button={(_, toggle) => <IconTabUnselected onClick={toggle} />}
                    startOpen={current.tabs != null}
                    body={
                        <Tabs
                            tabs={current.tabs}
                            onChange={(tabs) => setEdited({...current, tabs})}
                        />
                    }
                />
            ) : (
                <span />
            )}
            {edited != null ? (
                <span>
                    <CheckmarkIcon
                        style={{cursor: 'pointer', margin: 2}}
                        onClick={() => {
                            onChange(edited);
                            setEdited(null);
                        }}
                    />
                    <IconUndo
                        style={{cursor: 'pointer', margin: 2}}
                        onClick={() => {
                            setEdited(null);
                        }}
                    />
                </span>
            ) : (
                <span />
            )}
        </div>
    );
};

const tabsToString = (tabs?: Tabs) => (tabs ? `${tabs.count},${tabs.depth},${tabs.width}` : ',,');

type Tabs = NonNullable<GCodePath['tabs']>;
const Tabs = ({tabs, onChange}: {tabs?: Tabs; onChange: (tabs?: Tabs) => void}) => {
    const [text, setText] = useState(tabsToString(tabs));
    useEffect(() => {
        if (tabsToString(tabs) !== text) {
            setText(tabsToString(tabs));
        }
    }, [tabs]);
    const commit = () => {
        if (text.trim() === '' && tabs) {
            onChange(undefined);
            return;
        }
        const [count, depth, width] = text.split(',').map(Number);
        if (
            !isNaN(count) &&
            !isNaN(depth) &&
            !isNaN(width) &&
            (count !== tabs?.count || depth !== tabs?.depth || width !== tabs?.width)
        ) {
            onChange({count, depth, width});
        }
    };
    return (
        <Tooltip text="Count, Height, Width">
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #aaa',
                    color: 'inherit',
                    width: 40,
                }}
                onKeyDown={(evt) => {
                    if (evt.key === 'Enter') {
                        commit();
                    }
                }}
                onBlur={() => {
                    commit();
                }}
            />
        </Tooltip>
    );
};

const Float = ({
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
        <span>
            {button(show, () => setShow(!show))}
            {show ? body : null}
        </span>
    );
};
