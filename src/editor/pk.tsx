import PathKitInit, {PathKit} from 'pathkit-wasm';
import {useEffect, useState} from 'react';
import * as React from 'react';
import {PKContext} from './pk.usePK.related';

export let PK: PathKit = null!;

export const WithPathKit = ({children}: {children: React.ReactNode}) => {
    const [pk, setPk] = useState(null as null | PathKit);
    useEffect(() => {
        PathKitInit({
            locateFile: (file) =>
                (process.env.NODE_ENV === 'development' ? '/node_modules/pathkit-wasm/bin/' : '/') +
                file,
        }).then((pk) => {
            setPk(pk);
            PK = pk;
        });
    }, []);
    if (!pk) return null;
    return <PKContext.Provider value={pk}>{children}</PKContext.Provider>;
};
