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

export const updatePreview = async (id: string, token: string, blob: Blob) => {
    const dir = '/' + id;
    const args = {
        fs,
        http,
        dir,
        onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
        url: `https://gist.github.com/${id}.git`,
        corsProxy: 'https://cors.isomorphic-git.org',
    };
    await git.clone(args);
    fs.writeFileSync(dir + '/preview.png', await blobToBuffer(blob));
    await git.add({ fs, dir, filepath: 'preview.png' });
    await git.commit({
        fs,
        dir,
        message: 'update preview',
        author: { name: 'test', email: '' },
    });
    await git.push(args);
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
                'state.json': {
                    content: JSON.stringify(state),
                },
            },
        }),
    });
    const data = await res.json();
    await updatePreview(data.id, token, blob);
    return data.id;
};
