import {useState} from 'react';
import {usePromise} from './hooks/usePromise';
import {Page} from './Page';
import {keys} from './state-editor/kv-idb';
import {addToMap} from '../../addToMap';
import {lsprefix} from './state-editor/saveAnnotation';
import {AnnotationView} from './state-editor/AnnotationView';
import {notNull} from './utils/notNull';
import {isValidHistory} from './types/load-state';

export const ListExports = () => {
    const all = usePromise((signal) =>
        fetch('/fs/exports', {signal})
            .then((r) => r.json())
            .then((v: {name: string; created: number; modified: number}[]) => {
                const patterns: Record<
                    string,
                    {id: string; icon?: {id: string; created: number}; modified: number}
                > = {};
                v.forEach(({name, created, modified}) => {
                    if (name.endsWith('.json')) {
                        const id = name.slice(0, -'.json'.length);
                        if (!patterns[id]) {
                            patterns[id] = {id, modified};
                        } else {
                            patterns[id].modified = modified;
                        }
                    } else if (name.endsWith('.png')) {
                        const parts = name.slice(0, -'.png'.length).split('-');
                        const iid = parts.pop()!;
                        const id = parts.join('-');
                        if (!patterns[id]) {
                            patterns[id] = {id, modified: created, icon: {id: iid, created}};
                        } else if (!patterns[id].icon || patterns[id].icon.created < created) {
                            patterns[id].icon = {id: iid, created};
                        }
                    }
                });
                return Object.values(patterns).sort((a, b) => b.modified - a.modified);
            }),
    );

    const fromLS = usePromise(async () => {
        const all = Object.keys(localStorage);
        const idbkeys = await keys();
        const byid: Record<string, string[]> = {};
        idbkeys.forEach((key) => {
            if (typeof key === 'string') {
                const parts = key.split('-');
                const id = parts.slice(0, -1).join('-');
                addToMap(byid, id, key);
            }
        });
        return all
            .map((id) => {
                try {
                    const data = JSON.parse(localStorage[id]);
                    if (isValidHistory(data)) {
                        const matching = byid[id] ?? [];
                        return {id, icon: matching.length ? matching[0] : null};
                    }
                } catch (err) {}
                return null;
            })
            .filter(notNull);
    });

    const bcr = [
        {
            title: 'Geometric Art',
            href: '/',
            dropdown: [{title: 'Gallery', href: '/gallery/'}],
        },
        {title: 'Exports', href: '/export/'},
    ];
    if (!all || !fromLS) {
        return (
            <Page breadcrumbs={bcr}>
                <div>Loading...</div>
            </Page>
        );
    }
    if (all.type === 'err' || fromLS.type === 'err') {
        return (
            <Page breadcrumbs={bcr}>
                <div>Failed to load exports</div>
            </Page>
        );
    }

    return (
        <Page breadcrumbs={bcr}>
            <div className="flex flex-row flex-wrap gap-4 p-4">
                {all.value.map(({id, icon}) => (
                    <div>
                        <a className="link" href={`/export/${id}`}>
                            {icon ? (
                                <img
                                    width={200}
                                    height={200}
                                    src={`/assets/exports/${id}-${icon.id}.png`}
                                />
                            ) : (
                                id
                            )}
                        </a>
                    </div>
                ))}
            </div>
            <div className="flex flex-row flex-wrap gap-4 p-4">
                {fromLS.value.map(({id, icon}) => (
                    <div>
                        <a className="link" href={`/export/${lsprefix}${id}`}>
                            {icon ? <AnnotationView size={200} src={`idb:${icon}`} image /> : id}
                        </a>
                    </div>
                ))}
            </div>
        </Page>
    );
};
