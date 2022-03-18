// import Index from './index.mdx';
import * as React from 'react';
import { render } from 'react-dom';
import { LineLine } from './LineLine';
import { ArcArc } from './ArcArc';
import { UntangleHit } from './UntangleHit';

render(
    <div>
        {/* <LineLine /> */}
        {/* <ArcArc /> */}
        <UntangleHit />
    </div>,
    document.getElementById('root'),
);
