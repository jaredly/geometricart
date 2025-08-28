import * as React from "react";

export const Slider = ({
	inset,
	onChange,
}: {
	inset: number;
	onChange: (value: number) => void;
}) => {
	const [moving, setMoving] = React.useState(false);
	const ref = React.useRef(null as null | SVGGElement);
	React.useEffect(() => {
		if (!moving || !ref.current || !onChange) return;
		let svg = ref.current!.parentElement!;
		while (svg && svg.nodeName !== "svg") {
			// console.log(svg.nodeName);
			svg = svg.parentElement!;
		}
		if (!svg) {
			return console.error(`No svg parent`);
		}
		const fn = (evt: MouseEvent) => {
			const box = svg.getBoundingClientRect();
			let pos = {
				x: evt.clientX - box.left,
				y: evt.clientY - box.top,
			};
			onChange(pos.x - 150);
		};
		const up = () => setMoving(false);
		document.addEventListener("mousemove", fn);
		document.addEventListener("mouseup", up);
		return () => {
			document.removeEventListener("mousemove", fn);
			document.removeEventListener("mouseup", up);
		};
	}, [moving]);

	return (
		<g ref={(n) => (ref.current = n)}>
			<circle
				cx={150}
				cy={280}
				r={3}
				stroke="currentColor"
				strokeWidth="2"
				fill="none"
			/>
			<text
				x={150}
				y={295}
				textAnchor="middle"
				fontFamily="sans-serif"
				fontSize={10}
				fill="currentColor"
			>
				{inset.toFixed(0)}
			</text>
			<line
				x1={20}
				y1={280}
				x2={280}
				y2={280}
				stroke="currentColor"
				strokeDasharray="1 1"
				strokeWidth="1"
			/>
			<circle
				cx={150 + inset}
				cy={280}
				r={5}
				fill="currentColor"
				style={{ cursor: "move" }}
				onMouseDown={(evt) => {
					evt.preventDefault();
					setMoving(true);
				}}
			/>
		</g>
	);
};
