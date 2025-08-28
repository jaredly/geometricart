import * as React from "react";
import { Coord, State } from "./types";
// @ts-ignore
import { Homography } from "homography";
import { Action } from "./state/Action";
import { push } from "./rendering/getMirrorTransforms";

type Guide =
	| { type: "rect"; points: [Coord, Coord, Coord, Coord] }
	| { type: "angle"; points: [Coord, Coord, Coord]; target: number }
	| { type: "equal-length"; lines: [Coord, Coord][] };

export const OverlayEditor = ({
	state,
	dispatch,
}: {
	state: State;
	dispatch: React.Dispatch<Action>;
}) => {
	const [points, setPoints] = React.useState([] as Coord[]);

	const ov = Object.values(state.overlays)[0];
	const ref = React.useRef<HTMLImageElement>(null);

	const h2 = React.useMemo(() => {
		if (!ref.current) {
			return;
		}
		let pts = points;
		if (pts.length < 3) {
			const pp = state.attachments[ov.source].perspectivePoints;
			if (pp) {
				pts = pp.from;
			} else {
				return;
			}
		}

		const w = ref.current!.naturalWidth;
		const h = ref.current!.naturalHeight;
		if (!w || !h) return;

		const smaller = Math.min(w, h) / 2;

		const to_: Coord[] = [];

		for (let i = 0; i < pts.length; i++) {
			to_.push(
				push({ x: w / 2, y: h / 2 }, ((Math.PI * 2) / pts.length) * i, smaller),
			);
		}

		const hog = new Homography();
		hog.setImage(ref.current!);

		const x1 = Math.max(0, (w - h) / w / 2);
		const x2 = 1 - x1;

		const y1 = Math.max(0, (h - w) / h / 2);
		const y2 = 1 - y1;

		const to = [
			{ x: x1, y: y1 },
			{ x: x1, y: y2 },
			{ x: x2, y: y2 },
			{ x: x2, y: y1 },
		] as [Coord, Coord, Coord, Coord];

		const to2 = to_.map(({ x, y }) => ({ x: x / w, y: y / h }));

		console.log(points, to, to2);

		if (pts.length !== to.length) {
			return;
		}

		// console.log(x1, y1, x2, y2);
		console.log(w, h);
		hog.setReferencePoints(
			pts.map(({ x, y }) => [x, y]),
			// to_.map(({ x, y }) => [x / w, y / h]),
			to.map(({ x, y }) => [x, y]),
		);

		const img: ImageData = hog.warp();
		console.log(img);
		const canv = document.createElement("canvas");
		canv.width = img.width;
		canv.height = img.height;
		const ctx = canv.getContext("2d")!;
		ctx.putImageData(img, 0, 0);
		return { data: canv.toDataURL(), to };
	}, [
		points,
		ref.current,
		ov ? state.attachments[ov.source].perspectivePoints : null,
	]);

	if (!ov) return <h1>No overlays</h1>;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				flexDirection: "column",
			}}
		>
			<div style={{ position: "relative" }}>
				<img
					ref={ref}
					src={state.attachments[ov.source].contents}
					crossOrigin="anonymous"
					onClick={(evt) => {
						const box = evt.currentTarget.getBoundingClientRect();
						const x = evt.clientX - box.left;
						const y = evt.clientY - box.top;
						const px = x / box.width;
						const py = y / box.height;
						setPoints([...points, { x: px, y: py }]);
					}}
				/>
				{points.map((p, i) => (
					<div
						key={i}
						style={{
							width: 6,
							height: 6,
							marginLeft: -3,
							marginTop: -3,
							background: "red",
							top: `${(p.y * 100).toFixed(2)}%`,
							left: `${(p.x * 100).toFixed(2)}%`,
							position: "absolute",
						}}
					></div>
				))}
			</div>
			{h2 ? (
				<div>
					Transformed image:
					<img src={h2.data} />
					<button
						onClick={() => {
							dispatch({
								type: "attachment:update",
								id: ov.source,
								attachment: {
									perspectivePoints: {
										from: points as [Coord, Coord, Coord, Coord],
										to: h2.to,
									},
								},
							});
						}}
					>
						Save perspective
					</button>
				</div>
			) : (
				"not enough pts"
			)}
		</div>
	);
};
