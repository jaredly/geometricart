import { css } from "@emotion/css";
import React from "react";
import { push } from "../rendering/getMirrorTransforms";
import { Bounds, visibleEndPoints } from "./GuideElement";
import { Primitive } from "../rendering/intersect";
import { useTouchClick } from "./RenderIntersections";
import { arcPath } from "./RenderPendingPath";

const hoverClass = css({
	":hover": {
		stroke: "#fff",
	},
});

export function RenderPrimitive({
	prim,
	zoom,
	onClick,
	isImplied,
	bounds,
	color,
	inactive,
	touchOnly,
	strokeWidth = 1,
}: {
	color?: string;
	isImplied?: boolean;
	prim: Primitive;
	bounds: Bounds;
	zoom: number;
	touchOnly?: boolean;
	inactive?: boolean;
	strokeWidth?: number;
	onClick?: (shiftKey: boolean) => unknown;
}) {
	const handlers = useTouchClick<void>(() => {
		if (onClick) {
			onClick(false);
		}
	});

	const common = {
		stroke: color ?? (inactive ? "rgba(102, 102, 102, 0.3)" : "#666"),
		strokeWidth,
		onClick: onClick
			? (evt: React.MouseEvent) => {
					evt.stopPropagation();
					onClick(evt.shiftKey);
				}
			: undefined,
		...handlers(undefined),
		style: onClick ? { cursor: "pointer" } : {},
		strokeDasharray: isImplied ? "3 3" : "",
		...(touchOnly
			? {
					strokeWidth: 20,
					strokeLinecap: "round" as "round",
					opacity: 0.01,
					stroke: "blue",
				}
			: {}),
		className: onClick ? hoverClass : undefined,
	};
	if (prim.type === "line") {
		if (prim.limit) {
			if (prim.m === Infinity) {
				return (
					<line
						x1={prim.b * zoom}
						y1={prim.limit[0] * zoom}
						y2={prim.limit[1] * zoom}
						x2={prim.b * zoom}
						{...common}
					/>
				);
			}
			return (
				<line
					x1={prim.limit[0] * zoom}
					y1={prim.limit[0] * zoom * prim.m + prim.b * zoom}
					x2={prim.limit[1] * zoom}
					y2={prim.limit[1] * zoom * prim.m + prim.b * zoom}
					{...common}
				/>
			);
		} else {
			const [left, right] = visibleEndPoints(prim, bounds);
			return (
				<line
					x1={left.x * zoom}
					y1={left.y * zoom}
					x2={right.x * zoom}
					y2={right.y * zoom}
					{...common}
				/>
			);
		}
	}
	if (prim.limit && prim.limit[0] !== prim.limit[1]) {
		const [t0, t1] = prim.limit;
		const p0 = push(prim.center, t0, prim.radius);
		return (
			<path
				d={`M${p0.x * zoom},${p0.y * zoom} ${arcPath(
					{
						type: "Arc",
						center: prim.center,
						clockwise: true,
						to: push(prim.center, t1, prim.radius),
					},
					p0,
					zoom,
				)}`}
				{...common}
				fill="none"
			/>
		);
	}
	return (
		<circle
			cx={prim.center.x * zoom}
			cy={prim.center.y * zoom}
			r={prim.radius * zoom}
			fill="none"
			{...common}
		/>
	);
}
