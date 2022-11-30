import * as React from 'react';
import localforage from 'localforage';

export const useGists = () => {
    const urlToken = new URLSearchParams(window.location.search).get(
        'access_token',
    );
    const token = urlToken ?? localStorage.github_access_token;
    if (!token) {
        return { token: null, gists: null };
    }
    if (token !== localStorage.github_access_token) {
        localStorage.github_access_token = token;
        localforage.removeItem(gistCache);
    }
    const [gists, setGists] = React.useState(null as null | Array<Gist>);

    React.useEffect(() => {
        if (urlToken) {
            history.pushState({}, '', window.location.pathname);
        }
        localforage.getItem(gistCache).then((data) => {
            const cached = data as null | { time: number; gists: Gist[] };
            if (cached && cached.time > Date.now() - 1000 * 60 * 60) {
                setGists(cached.gists as Gist[]);
            } else {
                fetch('https://api.github.com/gists?per_page=100', {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        Authorization: 'Bearer ' + token,
                    },
                })
                    .then((res) => res.json())
                    .then((gists) => {
                        localforage.setItem(gistCache, {
                            time: Date.now(),
                            gists,
                        });
                        setGists(gists);
                    });
            }
        });
    }, []);

    return { token, gists };
};

export type Gist = {
    url: string;
    forks_url: string;
    commits_url: string;
    id: string;
    node_id: string;
    git_pull_url: string;
    git_push_url: string;
    html_url: string;
    files: {
        [fileName: string]: {
            filename: string;
            type: string;
            language: string;
            raw_url: string;
            size: number;
        };
    };
    public: boolean;
    created_at: string;
    updated_at: string;
    description: string;
    comments: number;
    user: null;
    comments_url: string;
    owner: {
        login: string;
        id: 1;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
    };
    truncated: boolean;
};
export const gistCache = `gist-cache`;
