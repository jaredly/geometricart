import {useState} from 'react';
import {useResettingState, useWindowState} from './state';
import {useValue} from '../../../../json-diff/react';

export const Sidebar = () => {
    const v = useWindowState();
    const swidth = useValue(v.$.rightBarSize);

    const [width, setWidth] = useResettingState(swidth);

    return (
        <div style={{width}}>
            {/*<MoveBar />
        <AccordionSidebar>
        </AccordionSidebar>*/}
        </div>
    );
};
