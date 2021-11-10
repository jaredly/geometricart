import React from 'react';
import { State, migrateState } from './types';
import { getStateFromFile } from './Sidebar';

export const useDropTarget = (onDrop: (state: State) => void) => {
    const [dragging, setDragging] = React.useState(false);

    const tid = React.useRef(null as null | NodeJS.Timeout);

    React.useEffect(() => {
        window.ondragend = () => {
            console.log('ended fokls');
        };
    }, []);

    const callbacks = {
        onDragOver: (evt: React.DragEvent) => {
            // setDragging(true);
            evt.preventDefault();
            if (tid.current) {
                clearTimeout(tid.current);
                tid.current = null;
            }
            tid.current = setTimeout(() => {
                setDragging(false);
            }, 300);
        },
        onDragEnter: (evt: React.DragEvent) => {
            // if (evt.target === evt.currentTarget) {
            if (tid.current) {
                clearTimeout(tid.current);
                tid.current = null;
            }
            console.log('enter');
            setDragging(true);
            evt.preventDefault();
            // }
        },
        // onDragLeave: (evt: React.DragEvent) => {
        //     if (evt.target === evt.currentTarget) {
        //         console.log(`leave`);
        //         tid.current = setTimeout(() => {
        //             setDragging(false);
        //         }, 100);
        //         evt.preventDefault();
        //     }
        // },
        // onDragEnd: (evt: React.DragEvent) => {
        //     if (evt.target === evt.currentTarget) {
        //         console.log(`drag end`);
        //         setDragging(false);
        //         evt.preventDefault();
        //     }
        // },
        onMouseOut: (evt: React.MouseEvent) => {
            if (evt.target === evt.currentTarget) {
                console.log('mouse leave');
                setDragging(false);
                evt.preventDefault();
            }
        },
        // onMouseUp: (evt: React.MouseEvent) => {
        //     if (evt.target === evt.currentTarget) {
        //         setDragging(false);
        //         evt.preventDefault();
        //     }
        // },
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
