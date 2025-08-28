import React, { useMemo } from "react";
// @ts-expect-error
import prettier from "prettier";
// @ts-expect-error
import babel from "prettier/parser-babel";
import { BlurInt } from "../editor/Forms";
import { Action } from "../state/Action";
import {
	FloatLerp as FLT,
	ScriptLerp as SLT,
	LerpPoint,
	State,
	PosScript,
} from "../types";
import { PointsEditor, pointsPathD } from "./PointsEditor";
import { AddVbl } from "./AnimationUI";
import { functionWithBuiltins } from "./getAnimatedPaths";

export function Lerps({
	dispatch,
	state,
}: {
	dispatch: (action: Action) => unknown;
	state: State;
}) {
	return (
		<div style={{ flex: 1, overflow: "auto" }}>
			<AddVbl
				onAdd={(key, vbl) => {
					dispatch({ type: "timeline:update", key, vbl });
				}}
			/>
			{Object.keys(state.animations.lerps).map((key) => {
				const vbl = state.animations.lerps[key];
				if (vbl.type !== "float") {
					return (
						<ScriptLerp key={key} id={key} vbl={vbl} dispatch={dispatch} />
					);
				}
				return <FloatLerp key={key} id={key} vbl={vbl} dispatch={dispatch} />;
			})}
		</div>
	);
}

function ScriptLerp({
	id: key,
	vbl,
	dispatch,
}: {
	id: string;
	vbl: SLT | PosScript;
	dispatch: (action: Action) => unknown;
}): JSX.Element {
	const [code, setCode] = React.useState(vbl.code);

	const fn = useMemo(() => {
		try {
			return functionWithBuiltins(vbl.code);
		} catch (e) {
			return () => 0;
		}
	}, [vbl.code]);

	return (
		<div
			style={{
				padding: 8,
				margin: 8,
				border: "1px solid #aaa",
			}}
		>
			<div style={{ marginBottom: 4 }}>{key}</div>
			<textarea
				value={code}
				style={{ width: 400 }}
				onChange={(evt) => {
					setCode(evt.target.value);
				}}
				onBlur={() => {
					const formatted = prettier.format(code, {
						plugins: [babel],
						parser: "babel",
						printWidth: 60,
					});
					setCode(formatted);
					if (formatted.trim() === vbl.code.trim()) {
						return;
					}

					dispatch({
						type: "timeline:update",
						key,
						vbl: { ...vbl, code: formatted },
					});
				}}
			/>
			<FnViewer fn={fn} kind={vbl.type} />
			<button
				onClick={() => {
					dispatch({ type: "timeline:update", key, vbl: null });
				}}
			>
				Delete
			</button>
		</div>
	);
}

function FloatLerp({
	id: key,
	vbl,
	dispatch,
}: {
	id: string;
	vbl: FLT;
	dispatch: (action: Action) => unknown;
}): JSX.Element {
	const [current, setCurrentInner] = React.useState(null as null | FLT);
	const last = React.useRef(vbl.points);
	React.useEffect(() => {
		if (last.current !== vbl.points) {
			last.current = vbl.points;
			setCurrentInner((c) => (c ? { ...c, points: vbl.points } : c));
		}
	}, [vbl.points]);

	if (!current) {
		return (
			<div
				style={{
					padding: 8,
					margin: 8,
					border: "1px solid #aaa",
				}}
			>
				{key}
				<PointsViewer
					onClick={() => setCurrentInner(vbl)}
					points={vbl.points}
				/>
				<button
					onClick={() => {
						dispatch({ type: "timeline:update", key, vbl: null });
					}}
				>
					Delete
				</button>
			</div>
		);
	}

	return (
		<div
			style={{
				padding: 8,
				margin: 8,
				border: "1px solid #aaa",
			}}
		>
			{key}
			<button
				onClick={() => {
					dispatch({
						type: "timeline:update",
						key,
						vbl: current,
					});
					setCurrentInner(null);
				}}
			>
				Save
			</button>
			<button
				onClick={() => {
					setCurrentInner(null);
				}}
			>
				Cancel
			</button>
			<div>
				Range:
				<BlurInt
					value={current.range[0]}
					onChange={(low) => {
						if (low == null) return;
						dispatch({
							type: "timeline:update",
							key,
							vbl: {
								...current,
								range: [low, current.range[1]],
							},
						});
					}}
				/>
				<BlurInt
					value={current.range[1]}
					onChange={(high) => {
						if (high == null) return;
						dispatch({
							type: "timeline:update",
							key,
							vbl: {
								...current,
								range: [current.range[0], high],
							},
						});
					}}
				/>
			</div>
			<PointsEditor
				current={current.points}
				setCurrentInner={(points) =>
					typeof points === "function"
						? setCurrentInner((v) =>
								v ? { ...v, points: points(v.points) } : v,
							)
						: setCurrentInner((v) => (v ? { ...v, points } : v))
				}
			/>
		</div>
	);
}

export const FnViewer = ({
	fn,
	kind,
}: {
	fn: (n: number) => number;
	kind: "float-fn" | "pos-fn";
}) => {
	const width = 150;
	const height = kind === "float-fn" ? 50 : 150;
	const margin = 5;

	const points = useMemo(() => {
		try {
			const points = [];
			for (let i = 0; i <= width; i++) {
				if (kind === "pos-fn") {
					points.push(fn(i / width) as any);
				} else {
					const x = i / width;
					const y = fn(x);
					points.push({ x, y });
				}
			}
			return points;
		} catch (err) {
			return [];
		}
	}, [fn]);

	return (
		<svg
			width={width + margin * 2}
			height={height + margin * 2}
			viewBox={`${-margin} ${-margin} ${width + margin * 2} ${height + margin * 2}`}
			style={{
				border: "1px solid #333",
			}}
		>
			<polyline
				points={points
					.map((m) => `${m.x * width},${(1 - m.y) * height}`)
					.join(" ")}
				stroke="red"
				strokeWidth={2}
				fill="none"
			/>
		</svg>
	);
};

export const PointsViewer = ({
	points,
	onClick,
}: {
	points: Array<LerpPoint>;
	onClick: () => void;
}) => {
	const width = 50;
	const height = 50;

	const path = pointsPathD(height, points, width);
	return (
		<svg onClick={onClick} width={width} height={height}>
			<path d={path} stroke="red" strokeWidth={1} fill="none" />
		</svg>
	);
};
