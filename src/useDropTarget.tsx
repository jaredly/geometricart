import React from 'react';
import { State, migrateState } from './types';
import { getStateFromFile } from './Sidebar';

export const useDropTarget = (onDrop: (state: State) => void) => {
    const [dragging, setDragging] = React.useState(false);

    const tid = React.useRef(null as null | NodeJS.Timeout);

    const callbacks = {
        onDragOver: (evt: React.DragEvent) => {
            setDragging(true);
            evt.preventDefault();
            if (tid.current) {
                clearTimeout(tid.current);
                tid.current = null;
            }
            tid.current = setTimeout(() => {
                setDragging(false);
            }, 300);
        },
        onDrop: (evt: React.DragEvent) => {
            console.log(evt.dataTransfer.files[0]);
            getStateFromFile(evt.dataTransfer.files[0], (state) => {
                if (state) {
                    onDrop(migrateState(state));
                    // dispatch({ type: 'reset', state: migrateState(state) });
                }
            });
            evt.preventDefault();
            setDragging(false);
        },
    };
    return [dragging, callbacks];
};
