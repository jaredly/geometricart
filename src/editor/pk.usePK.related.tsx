import {PathKit} from 'pathkit-wasm';
import {createContext} from 'react';
import * as React from 'react';

export const PKContext = createContext(null as any as PathKit);

export const usePK = (): PathKit => React.useContext(PKContext);