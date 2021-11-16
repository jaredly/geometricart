import React from 'react';
import { State, migrateState } from './types';
import { readMetadata } from 'png-metadata';
import { PREFIX, SUFFIX } from './Sidebar';

export const useDropTarget = (onDrop: (file: File) => void) => {
    const [dragging, setDragging] = React.useState(false);

    const tid = React.useRef(null as null | NodeJS.Timeout);

    const callbacks = {
        onDragOver: (evt: React.DragEvent) => {
            evt.stopPropagation();
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
            evt.stopPropagation();
            evt.preventDefault();
            setDragging(false);
            onDrop(evt.dataTransfer.files[0]);
        },
    };
    return [dragging, callbacks];
};

export const useDropStateTarget = (onDrop: (state: State) => void) => {
    return useDropTarget((file) => {
        getStateFromFile(file, (state) => {
            if (state) {
                onDrop(migrateState(state));
            }
        });
    });
};

export const getStateFromFile = (
    file: File,
    done: (s: State | null) => void,
) => {
    if (file.type === 'image/png') {
        const reader = new FileReader();
        reader.onload = () => {
            const buffer = new Uint8Array(reader.result as ArrayBuffer);
            const meta = readMetadata(buffer);
            if (meta.tEXt['GeometricArt']) {
                done(JSON.parse(meta.tEXt['GeometricArt']));
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => {
            const last = (reader.result as string)
                .split('\n')
                .slice(-1)[0]
                .trim();
            if (last.startsWith(PREFIX) && last.endsWith(SUFFIX)) {
                done(JSON.parse(last.slice(PREFIX.length, -SUFFIX.length)));
            } else {
                console.log('not last, bad news');
                console.log(last);
                done(null);
            }
        };
        reader.readAsText(file);
    }
};
