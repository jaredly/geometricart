import * as React from 'react';
import { Action } from './state/Action';
import { State } from './types';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Hover } from './editor/Sidebar';

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
            >
                <AccordionTab header="Mirrors">
                    {Object.entries(state.mirrors).map(([k, mirror]) => (
                        // TODO: Hoverrrrrrrr to show it
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
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                className="p-button-sm p-button-rounded p-button-text"
                                icon={
                                    'pi pi-eye' + (guide.active ? '' : '-slash')
                                }
                                onClick={() => {
                                    dispatch({
                                        type: 'guide:toggle',
                                        id: k,
                                    });
                                }}
                                style={{ marginRight: 8 }}
                            />
                            {guide.geom.type}
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
