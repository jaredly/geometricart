import {useCallback} from 'react';
import {ExportHistory} from '../ExportHistory';
import {PatternExport} from '../pattern-export';
import {Page} from '../Page';
import {useInitialPatterns} from '../useInitialPatterns';
import {usePromise} from '../usePromise';
import typia from 'typia';

const isHistory = typia.createIs<ExportHistory>();

const lsprefix = 'localstorage:';

const loadFromSrc = async (src: string, signal: AbortSignal) => {
    if (src.startsWith(lsprefix)) {
        const key = src.slice(lsprefix.length);
        const value = localStorage[key];
        if (!value) throw new Error(`Key ${key} not found in localStorage`);
        let data: unknown;
        try {
            data = JSON.parse(value);
        } catch (err) {
            throw new Error(`Data in localStorage "${key}" not valid json`);
        }
        if (isHistory(data)) {
            return data;
        }
        throw new Error(`Data is in the wrong format!`);
    }
    const res = await fetch(src, {signal});
    const data = await res.json();
    if (isHistory(data)) {
        return data;
    }
    throw new Error(`Data is in the wrong format!`);
};

const saveToSrc = async (src: string, data: ExportHistory) => {
    if (src.startsWith(lsprefix)) {
        const key = src.slice(lsprefix.length);
        localStorage[key] = JSON.stringify(data);
        return;
    }

    return fetch(src, {
        method: 'POST',
        body: JSON.stringify(data, null, 2),
        headers: {'Content-type': 'application/json'},
    });
};

export const PatternExportIsolated = () => {
    const src = new URL(window.location.href).searchParams.get('src');

    const state = usePromise(
        (signal) => (src ? loadFromSrc(src, signal) : Promise.resolve(null)),
        [src],
    );

    const onSave = useCallback(
        (state: ExportHistory) => (src ? saveToSrc(src, state) : null),
        [src],
    );

    const initialPatterns = useInitialPatterns(state?.type === 'res' ? state.value : undefined);

    if (!src) {
        return <div>No `?src` provided.</div>;
    }
    if (!state || !initialPatterns) {
        return <div>Loading...</div>;
    }
    if (state.type === 'err' || initialPatterns.type === 'err') {
        return <div>Unable to load {src}</div>;
    }
    if (!state.value) {
        return <div>Loading...</div>;
    }

    return (
        <Page
            breadcrumbs={[
                {title: 'Geometric Art', href: '/'},
                {title: 'Deprecated Editor', href: window.location.pathname},
            ]}
        >
            <PatternExport
                initial={state.value}
                onSave={onSave}
                initialPatterns={initialPatterns.value}
            />
        </Page>
    );
};

export default PatternExportIsolated;
