import * as git from 'isomorphic-git';
import LighteningFS from '@isomorphic-git/lightning-fs';
import { State } from './types';
import http from 'isomorphic-git/http/web';
import { fs } from 'memfs-browser';
import { Buffer } from 'buffer';

const blobToBuffer = (blob: Blob): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
            resolve(Buffer.from(reader.result as ArrayBuffer));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

export const stateFileName = `geometric-art-state.json`;

export const updateGitRepo = async (
    id: string,
    token: string,
    blob: Blob,
    state?: State,
) => {
    const dir = '/' + id;
    const args = {
        fs,
        http,
        dir,
        onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
        url: `https://gist.github.com/${id}.git`,
        // TODO: Can I replace this with a cloudflare-hosted thing? Would be better.
        corsProxy: 'https://cors.isomorphic-git.org',
    };
    await git.clone(args);
    fs.writeFileSync(dir + '/preview.png', await blobToBuffer(blob));
    await git.add({ fs, dir, filepath: 'preview.png' });
    if (state) {
        fs.writeFileSync(dir + '/' + stateFileName, JSON.stringify(state));
        await git.add({ fs, dir, filepath: stateFileName });
    }
    await git.commit({
        fs,
        dir,
        message: 'update preview' + (state ? ' and state' : ''),
        author: { name: 'geometric-art', email: '' },
    });
    await git.push(args);
};

export const loadGist = async (id: string, token: string) => {
    const res = await fetch(`https://api.github.com/gists/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
        },
    });
    const data = await res.json();
    const file = data.files[stateFileName];
    if (file.truncated) {
        const res = await fetch(file.raw_url);
        return await res.json();
    } else {
        return JSON.parse(file.content);
    }
};

export const newGist = async (state: State, blob: Blob, token: string) => {
    const res = await fetch(`https://api.github.com/gists`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            description: 'Geometric Art',
            public: false,
            files: {
                [stateFileName]: {
                    content: JSON.stringify(state),
                },
            },
        }),
    });
    const data = await res.json();
    await updateGitRepo(data.id, token, blob);
    return data.id;
};

export const saveGist = (
    id: string,
    state: State,
    blob: Blob,
    token: string,
) => {
    return updateGitRepo(id, token, blob, state);
};
