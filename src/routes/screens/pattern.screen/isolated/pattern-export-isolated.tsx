import {useCallback} from 'react';
import {ExportHistory} from '../ExportHistory';
import {PatternExport} from '../pattern-export';
import {Page} from '../Page';
import {useInitialPatterns} from '../useInitialPatterns';
import {usePromise} from '../usePromise';
import typia from 'typia';
import {useLocation} from 'react-router';

const validateHistory = typia.createValidate<ExportHistory>();

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
        const valid = validateHistory(data);
        if (valid.success) {
            return valid.data;
        }
        console.log('wrong format', valid);
        throw new Error(`Data is in the wrong format!`);
    }
    console.log('fetching', src);
    const res = await fetch(src, {signal});
    const data = await res.json();
    const valid = validateHistory(data);
    if (valid.success) {
        return valid.data;
    }
    console.log('validation error', valid);
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
    const loc = useLocation();
    const src = new URLSearchParams(loc.search).get('src');

    const state = usePromise(
        (signal) => (src ? loadFromSrc(src, signal) : Promise.resolve(null)),
        [src],
    );

    const onSave = useCallback(
        (state: ExportHistory) => (src ? saveToSrc(src, state) : null),
        [src],
    );

    const initialPatterns = useInitialPatterns(state?.type === 'res' ? state.value : undefined);

    const snapshotUrl = useCallback(
        (aid: string, ext: string) => src?.replace('.json', `-${aid}.${ext}`) ?? '',
        [src],
    );

    if (!src) {
        return <div>No `?src` provided.</div>;
    }
    if (!state || !initialPatterns) {
        return <div>Loading...</div>;
    }
    if (state.type === 'err') {
        return (
            <div>
                Unable to load {src} : error message {state.error.message}
            </div>
        );
    }
    if (initialPatterns.type === 'err') {
        return <div>Unable to load patterns {initialPatterns.error.message}</div>;
    }
    if (!state.value) {
        return <div>Loading...</div>;
    }

    return (
        <Page
            breadcrumbs={[
                {title: 'Geometric Art', href: '/'},
                {title: 'Deprecated Editor', href: loc.pathname},
            ]}
        >
            <PatternExport
                initial={state.value}
                onSave={onSave}
                initialPatterns={initialPatterns.value}
                namePrefix="deprecated-editor-"
                snapshotUrl={snapshotUrl}
            />
        </Page>
    );
};

export default PatternExportIsolated;
