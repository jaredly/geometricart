import {usePromise} from './hooks/usePromise';
import {Page} from './Page';

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
    const bcr = [
        {
            title: 'Geometric Art',
            href: '/',
            dropdown: [{title: 'Gallery', href: '/gallery/'}],
        },
        {title: 'Exports', href: '/export/'},
    ];
    if (!all) {
        return (
            <Page breadcrumbs={bcr}>
                <div>Loading...</div>
            </Page>
        );
    }
    if (all.type === 'err') {
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
        </Page>
    );
};
