// import Index from './index.mdx';
import * as React from "react";
import { render } from "react-dom";
// import { LineLine } from './LineLine';
// import { ArcArc } from './ArcArc';
import { UntangleHit } from "./UntangleHit";

// @ts-ignore
window.____SHOW = (what) => {
	console.warn("OK", what);
};

render(
	<div>
		{/* <LineLine /> */}
		{/* <ArcArc /> */}
		<UntangleHit />
	</div>,
	document.getElementById("root"),
);
