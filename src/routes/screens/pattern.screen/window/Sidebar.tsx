import {useState} from 'react';
import {useResettingState, useWindowState} from './state';

export const Sidebar = () => {
    const v = useWindowState();
    const swidth = v.use((v) => v.rightBarSize);

    const [width, setWidth] = useResettingState(swidth);

    return (
        <div style={{width}}>
            {/*<MoveBar />
        <AccordionSidebar>
        </AccordionSidebar>*/}
        </div>
    );
};
