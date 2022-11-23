import * as React from 'react';
import { Action } from './state/Action';
import { Mirror, State } from './types';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Hover } from './editor/Sidebar';

import type * as CSS from 'csstype';

declare module 'csstype' {
    interface Properties {
        '--hover-color'?: string;
    }
}

export const NewSidebar = ({
    state,
    dispatch,
    hover,
    setHover,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
    hover: Hover | null;
    setHover: (hover: Hover | null) => void;
}): JSX.Element => {
    return (
        <div
            style={{
                minWidth: 300,
                padding: 16,
                alignSelf: 'stretch',
                display: 'flex',
                overflow: 'auto',
            }}
        >
            <Accordion
                multiple
                activeIndex={[0]}
                style={{ padding: 0, flex: 1 }}
                onTabOpen={(evt) => {
                    if (evt.index === 1 && !state.view.guides) {
                        dispatch({
                            type: 'view:update',
                            view: { ...state.view, guides: true },
                        });
                    }
                }}
            >
                <AccordionTab
                    header="Mirrors"
                    contentStyle={{
                        padding: 0,
                    }}
                >
                    {Object.entries(state.mirrors).map(([k, mirror]) => (
                        <div
                            key={k}
                            className="field-radiobutton hover"
                            style={{
                                padding: 8,
                                cursor: 'pointer',
                                marginBottom: 0,
                                '--hover-color': 'rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                            }}
                            onMouseEnter={() =>
                                setHover({
                                    type: 'element',
                                    kind: 'Mirror',
                                    id: k,
                                })
                            }
                            onClick={() => {
                                if (state.activeMirror !== k) {
                                    dispatch({
                                        type: 'mirror:active',
                                        id: k,
                                    });
                                } else {
                                    dispatch({
                                        type: 'mirror:active',
                                        id: null,
                                    });
                                }
                            }}
                            onMouseLeave={() => setHover(null)}
                        >
                            <Checkbox
                                checked={state.activeMirror === k}
                                inputId={k}
                                onClick={(evt) => evt.stopPropagation()}
                                onChange={(evt) => {
                                    if (state.activeMirror !== evt.value) {
                                        dispatch({
                                            type: 'mirror:active',
                                            id: evt.value,
                                        });
                                    } else {
                                        dispatch({
                                            type: 'mirror:active',
                                            id: null,
                                        });
                                    }
                                }}
                                name="mirror"
                                value={k}
                            />
                            <label
                                htmlFor={k}
                                onClick={(evt) => evt.stopPropagation()}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '80%',
                                    cursor: 'pointer',
                                    flex: 1,
                                }}
                            >
                                {mirror.rotational.length}x at{' '}
                                {mirror.origin.x.toFixed(2)},
                                {mirror.origin.y.toFixed(2)}
                            </label>
                        </div>
                    ))}
                </AccordionTab>
                <AccordionTab
                    headerStyle={{ flex: 1 }}
                    header={
                        <div
                            style={{
                                flexDirection: 'row',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            Guides
                            <div style={{ flex: 1 }} />
                            <Button
                                className="p-button-sm p-button-rounded p-button-text"
                                icon={
                                    'pi pi-eye' +
                                    (state.view.guides ? '' : '-slash')
                                }
                                style={{
                                    marginTop: -10,
                                    marginBottom: -12,
                                }}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    dispatch({
                                        type: 'view:update',
                                        view: {
                                            ...state.view,
                                            guides: !state.view.guides,
                                        },
                                    });
                                }}
                            />
                        </div>
                    }
                >
                    {Object.entries(state.guides).map(([k, guide]) => (
                        <div
                            key={k}
                            className="hover"
                            style={{
                                padding: 8,
                                cursor: 'pointer',
                                marginBottom: 0,
                                '--hover-color': 'rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                            onMouseEnter={() =>
                                setHover({
                                    type: 'element',
                                    kind: 'Guide',
                                    id: k,
                                })
                            }
                            onClick={() => {}}
                            onMouseLeave={() => setHover(null)}
                        >
                            {guide.geom.type}
                            {guide.mirror
                                ? showMirror(guide.mirror, state.mirrors)
                                : null}
                        </div>
                    ))}
                </AccordionTab>
                {/* hmm ok so shapes ... grouped ... hm */}
                <AccordionTab header="Shapes"></AccordionTab>
                <AccordionTab header="Export"></AccordionTab>
                <AccordionTab header="Palette"></AccordionTab>
            </Accordion>
        </div>
    );
};

const showMirror = (
    id: string | Mirror,
    mirrors: { [key: string]: Mirror },
): JSX.Element => {
    const mirror = typeof id === 'string' ? mirrors[id] : id;
    return (
        <span style={{ fontSize: '80%', marginLeft: 16, opacity: 0.7 }}>
            {(mirror.rotational.length + 1) * (mirror.reflect ? 2 : 1)}x
        </span>
    );
};
