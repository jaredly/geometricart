// import Index from './index.mdx';
import * as React from 'react';
import { render } from 'react-dom';
import { LineLine } from './LineLine';
import { ArcArc } from './ArcArc';

render(
    <div>
        <LineLine />
        <ArcArc />
    </div>,
    document.getElementById('root'),
);
