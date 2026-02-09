import {useEffect, useRef, useState} from 'react';
import {makeContext} from '../../../../json-diff/react';

export type WindowState = {
    rightBarSize: number;
    rightBarCollapsed: boolean;
    sectionsExpanded: Record<string, boolean>;
};

export const [ProvideWindowState, useWindowState] = makeContext<WindowState>('type');

export const useResettingState = <T>(initial: T) => {
    const [value, setValue] = useState(initial);
    const prev = useRef(initial);
    useEffect(() => {
        if (prev.current !== initial) {
            setValue(initial);
            prev.current = initial;
        }
    }, [initial]);
    return [value, setValue] as const;
};
