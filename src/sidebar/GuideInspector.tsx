import React, { useMemo } from "react";
import { closeEnough } from "../rendering/epsilonToZero";
import { dist } from "../rendering/getMirrorTransforms";
import { Guide, State } from "../types";
import { Hover } from "../editor/Sidebar";

export const GuideInspector = ({
	state,
	setHover,
}: {
	state: State;
	setHover: (hover: Hover | null) => void;
}) => {
	const organized = useMemo(() => {
		const byDist: Record<string, Guide[]> = {};
		Object.values(state.guides).forEach((guide) => {
			switch (guide.geom.type) {
				case "CircleMark":
				case "CloneCircle": {
					const key = dist(guide.geom.p1, guide.geom.p2).toFixed(6);
					if (!byDist[key]) byDist[key] = [guide];
					else byDist[key].push(guide);
					break;
				}
			}
		});
		return byDist;
	}, [state.guides]);

	// if (state.selection?.type !== "Guide") return null;
	// const selected = state.selection.ids;
	// if (selected.length !== 1) return null; // idk
	// const guide = state.guides[selected[0]];
	// if (guide?.geom.type !== "CircleMark") return null;
	// const tdist = dist(guide.geom.p1, guide.geom.p2);
	// const others = Object.values(state.guides).filter(
	// 	(guide) =>
	// 		guide.geom.type === "CircleMark" &&
	// 		closeEnough(dist(guide.geom.p1, guide.geom.p2), tdist),
	// );
	// return <div>{others.length} guides found with the same radius</div>;

	return (
		<div>
			{Object.entries(organized).map(([dist, guides]) => (
				<div
					key={dist}
					style={{
						padding: "8px 16px",
						cursor: "pointer",
					}}
					onMouseOver={() => {
						setHover({
							type: "guides",
							ids: guides.map((g) => g.id),
						});
					}}
					onMouseOut={() => setHover(null)}
				>
					{guides.length} guides w/ radius {dist}
				</div>
			))}
		</div>
	);
};
