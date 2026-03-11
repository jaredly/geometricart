import React, {useCallback, useEffect, useRef, useState} from 'react';
import {makeContext, useValue} from '../../../../json-diff/react';
import typia from 'typia';
import {useLocalStorage} from '../../../../vest/useLocalStorage';

export type WindowState = {
    rightBarSize: number;
    rightBarCollapsed: boolean;
    sectionsExpanded: Record<string, boolean>;
};

export const initialWindowState: WindowState = {
    rightBarSize: 200,
    rightBarCollapsed: false,
    sectionsExpanded: {},
};

export const isWindowState = typia.createIs<WindowState>();

export const useSafeLocalStorage = <T>(key: string, initial: T, is: (v: unknown) => v is T) => {
    const [value, setValue] = React.useState((): T => {
        const data = localStorage[key];
        if (data) {
            const got = JSON.parse(data);
            if (is(got)) {
                return got;
            } else {
                console.error(`Unable to parse`);
                console.log(got);
            }
        }
        return initial;
    });

    const saved = useRef(initial);
    React.useEffect(() => {
        if (value !== saved.current) {
            localStorage[key] = JSON.stringify(value);
        }
    }, [value, key]);
    return [value, setValue] as const;
};

export const [ProvideWindowState, useWindowState] = makeContext<WindowState>('type');

export const useExpanded = (id: string) => {
    const v = useWindowState();
    const expanded = useValue(v.$.sectionsExpanded[id]);
    const setExpanded = useCallback(
        (expanded: boolean) => v.$.sectionsExpanded[id].$replace(expanded),
        [id, v],
    );
    return [expanded, setExpanded] as const;
};

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
