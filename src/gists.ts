import * as git from 'isomorphic-git';
import LighteningFS from '@isomorphic-git/lightning-fs';
import {State} from './types';
import http from 'isomorphic-git/http/web';
import {fs} from 'memfs-browser';
import {Buffer} from 'buffer';
import localforage from 'localforage';
import {gistCache, SmallGist} from './useGists';

const blobToBuffer = (blob: Blob): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

export const stateFileName = `geometric-art-state.json`;

const updateGitRepo = async (id: string, token: string, blob: Blob, state?: State) => {
    const dir = '/' + id;
    const args = {
        fs,
        http,
        dir,
        onAuth: () => ({username: token, password: 'x-oauth-basic'}),
        url: `https://gist.github.com/${id}.git`,
        // TODO: Can I replace this with a cloudflare-hosted thing? Would be better.
        corsProxy: 'https://cors.isomorphic-git.org',
    };
    await git.clone(args);
    fs.writeFileSync(dir + '/preview.png', await blobToBuffer(blob));
    await git.add({fs, dir, filepath: 'preview.png'});
    if (state) {
        fs.writeFileSync(dir + '/' + stateFileName, JSON.stringify(state));
        await git.add({fs, dir, filepath: stateFileName});
    }
    const sha = await git.commit({
        fs,
        dir,
        message: 'update preview' + (state ? ' and state' : ''),
        author: {name: 'geometric-art', email: ''},
    });
    await git.push(args);
    return sha;
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

export const saveGist = async (id: string, state: State, blob: Blob, token: string) => {
    // Ok I need to use this sha to update the preview_url
    const preview_sha = await updateGitRepo(id, token, blob, state);
    const data = await localforage.getItem<{
        time: number;
        gists: SmallGist[];
    }>(gistCache);
    const found = data?.gists.find((gist) => gist.id === id);
    if (found) {
        found.preview_sha = preview_sha;
        found.updated = new Date().toISOString();
        await localforage.setItem(gistCache, data);
    } else {
        console.warn('Could not find gist in cache', id, data);
    }
};
