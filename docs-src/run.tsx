// import Index from './index.mdx';
import * as React from 'react';
import { render } from 'react-dom';
import { LineLine } from './LineLine';
import { ArcArc } from './ArcArc';
import { UntangleHit } from './UntangleHit';

window.____SHOW = (what) => {
    console.log('OK', what);
};

render(
    <div>
        {/* <LineLine /> */}
        {/* <ArcArc /> */}
        <UntangleHit />
    </div>,
    document.getElementById('root'),
);
