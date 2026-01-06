import {usePromise} from './hooks/usePromise';
import {Page} from './Page';
import db from './state-editor/kv-idb';
import {addToMap} from '../../addToMap';
import {AnnotationView} from './state-editor/AnnotationView';
import {notNull} from './utils/notNull';
import {isValidHistory} from './types/load-state';
import {BaselineDownload} from '../../../icons/Icon';
import {idbprefix} from './state-editor/saveAnnotation';

type Listing = {id: string; icon?: {id: string; created: number}; modified: number};

const organizeExportFiles = (v: {name: string; created: number; modified: number}[]) => {
    const patterns: Record<string, Listing> = {};
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
    return patterns;
};

export const ListExports = () => {
    const all = usePromise((signal) =>
        fetch('/fs/exports', {signal})
            .then((r) => r.json())
            .then((v) => {
                return Object.values(organizeExportFiles(v)).sort(
                    (a, b) => b.modified - a.modified,
                );
            }),
    );

    const fromLS = usePromise(async () => {
        const patterns: Record<string, Listing> = {};
        for (let [key, meta] of await db.entries('exportMeta')) {
            if (typeof key === 'string') {
                patterns[key] = {id: key, modified: meta.updated};
            }
        }
        for (let [key, meta] of await db.entries('snapshotMeta')) {
            if (
                Array.isArray(key) &&
                key.length === 2 &&
                typeof key[0] === 'string' &&
                typeof key[1] === 'string'
            ) {
                const current = patterns[key[0]].icon;
                if (!current || current.created < meta.created) {
                    patterns[key[0]].icon = {created: meta.created, id: key[1]};
                }
            }
        }
        return Object.values(patterns).sort((a, b) => b.modified - a.modified);
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
                                <div
                                    style={{width: 200, height: 200}}
                                    className="flex flex-col items-center justify-center"
                                >
                                    <div>{id}</div>
                                    <div>no snapshots</div>
                                </div>
                            )}
                        </a>
                    </div>
                ))}
            </div>
            <div className="flex flex-row flex-wrap gap-4 p-4">
                {fromLS.value.map(({id, icon}) => (
                    <div className="relative">
                        <a className="link" href={`/export/${idbprefix}${id}`}>
                            {icon ? (
                                <AnnotationView
                                    size={200}
                                    src={{type: 'idb', id, aid: icon.id}}
                                    image
                                />
                            ) : (
                                id
                            )}
                        </a>
                        {/*<button
                            className="btn btn-square mr-4 absolute top-2 right-2"
                            onClick={() => {
                                // const v = localStorage[id];
                                // const blob = new Blob([v], {type: 'application/json'});
                                // const url = URL.createObjectURL(blob);
                                // const link = document.createElement('a');
                                // link.download = `${id}.json`;
                                // link.href = url;
                                // link.click();
                            }}
                        >
                            <BaselineDownload />
                        </button>*/}
                    </div>
                ))}
            </div>
        </Page>
    );
};
