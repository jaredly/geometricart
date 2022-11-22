import { Card } from 'primereact/card';
import * as React from 'react';
import { Action } from './state/Action';
import { State } from './types';
import { RadioButton } from 'primereact/radiobutton';
import { Checkbox } from 'primereact/checkbox';
import { Divider } from 'primereact/divider';
import { Accordion, AccordionTab } from 'primereact/accordion';

export const NewSidebar = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}): JSX.Element => {
    return (
        <div style={{ minWidth: 200, padding: 16, background: '#888' }}>
            <Accordion multiple activeIndex={[0]} style={{ padding: 0 }}>
                <AccordionTab header="Mirrors">
                    {Object.entries(state.mirrors).map(([k, mirror]) => (
                        <div key={k} className="field-radiobutton">
                            <Checkbox
                                checked={state.activeMirror === k}
                                inputId={k}
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
                            <label htmlFor={k}>
                                {mirror.rotational.length}x at{' '}
                                {mirror.origin.x.toFixed(2)},
                                {mirror.origin.y.toFixed(2)}
                            </label>
                        </div>
                    ))}
                </AccordionTab>
                <AccordionTab header="Guides"></AccordionTab>
                <AccordionTab header="Shapes"></AccordionTab>
                <AccordionTab header="Export"></AccordionTab>
                <AccordionTab header="Palette"></AccordionTab>
            </Accordion>
        </div>
    );
};
