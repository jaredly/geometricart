/* @jsx jsx */
import * as React from "react";
import { jsx } from "@emotion/react";
import { Coord, Id, Mirror } from "../types";
import { Toggle, Label, Int } from "./Forms";
import {
	angleTo,
	applyMatrices,
	dist,
	getTransformsForMirror,
	Matrix,
	push,
} from "../rendering/getMirrorTransforms";

export const ShowMirror = ({
	mirror,
	transforms,
	size = 200,
}: {
	mirror: Mirror;
	transforms: Array<Array<Matrix>>;
	size?: number;
}) => {
	const angle = angleTo(mirror.point, mirror.origin);
	const d = dist(mirror.point, mirror.origin);
	const base = push(mirror.point, angle, d / 2);
	const off = mirror.reflect ? push(base, angle + Math.PI / 2, d / 6) : base;
	const line = { p1: mirror.point, p2: off };

	const lines: Array<{ p1: Coord; p2: Coord }> = [line];
	transforms.forEach((transform) => {
		lines.push({
			p1: applyMatrices(line.p1, transform),
			p2: applyMatrices(line.p2, transform),
		});
	});
	let minX = lines.reduce((a, b) => Math.min(a, b.p1.x, b.p2.x), Infinity);
	let minY = lines.reduce((a, b) => Math.min(a, b.p1.y, b.p2.y), Infinity);
	let maxX = lines.reduce((a, b) => Math.max(a, b.p1.x, b.p2.x), -Infinity);
	let maxY = lines.reduce((a, b) => Math.max(a, b.p1.y, b.p2.y), -Infinity);
	minX = Math.min(minX, -maxX);
	minY = Math.min(minY, -maxY);
	maxX = Math.max(-minX, maxX);
	maxY = Math.max(-minY, maxY);
	const width = maxX - minX;
	const height = maxY - minY;

	// const size = 200;
	const inSize = size - 4;

	const scale = width < height ? inSize / height : inSize / width;

	const xoff = (minX - (width < height ? (height - width) / 2 : 0)) * scale - 2;
	const yoff = (minY - (height < width ? (width - height) / 2 : 0)) * scale - 2;

	return (
		<svg width={size} height={size} style={{ display: "block" }}>
			{lines.map((line, i) => (
				<line
					key={i}
					stroke="black"
					strokeWidth={5}
					strokeLinecap="round"
					x1={line.p1.x * scale - xoff}
					y1={line.p1.y * scale - yoff}
					x2={line.p2.x * scale - xoff}
					y2={line.p2.y * scale - yoff}
				/>
			))}
			{lines.map((line, i) => (
				<line
					key={i}
					strokeWidth={1}
					stroke="yellow"
					x1={line.p1.x * scale - xoff}
					y1={line.p1.y * scale - yoff}
					x2={line.p2.x * scale - xoff}
					y2={line.p2.y * scale - yoff}
				/>
			))}
		</svg>
	);
};

export const MirrorForm = ({
	mirror,
	onMouseOver,
	onMouseOut,
	onChange,
	onSelect,
	isActive,
	selected,
	// setSelected,
	onDuplicate,
	onChild,
	mirrors,
}: {
	mirror: Mirror;
	mirrors: { [key: Id]: Mirror };
	isActive: boolean;
	selected: boolean;
	onMouseOver: () => void;
	onMouseOut: () => void;
	// setSelected: (sel: boolean) => void;
	onChange: (m: Mirror) => unknown;
	onSelect: () => void;
	onDuplicate: () => void;
	onChild: () => void;
}) => {
	const transforms = React.useMemo(() => {
		return getTransformsForMirror(mirror.id, mirrors);
	}, [mirror.id, mirrors]);

	return (
		<div
			css={{
				padding: 8,
			}}
			style={selected ? { border: "1px solid white" } : {}}
			// onClick={(evt) => {
			//     evt.stopPropagation();
			//     setSelected(true);
			// }}
			onMouseOver={onMouseOver}
			onMouseOut={onMouseOut}
		>
			<div
				css={{
					cursor: "pointer",
					background: "rgba(100,100,100,0.1)",
					display: "flex",
					alignItems: "center",
				}}
				// onClick={onSelect}
			>
				Mirror
				<div style={{ flexBasis: 16 }} />
				<Toggle label="Active" value={isActive} onChange={onSelect} />
			</div>
			<button
				onClick={() => {
					onDuplicate();
				}}
			>
				Duplicate
			</button>
			<button
				onClick={() => {
					onChild();
				}}
			>
				Create child mirror
			</button>
			<ShowMirror mirror={mirror} transforms={transforms} />
		</div>
	);
};
