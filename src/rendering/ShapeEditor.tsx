import * as React from "react";
import { RenderSegmentBasic } from "../editor/RenderSegment";
import { Coord, Segment } from "../types";
import { SegmentWithPrev } from "./clipPathNew";
import { SegmentEditor, useInitialState } from "./SegmentEditor";

export const validSegments = (seg: Array<SegmentWithPrev>) => {
	if (seg.length === 0) {
		return false;
	}
	if (seg.length > 2) {
		return true;
	}
	return seg.some((s) => s.segment.type === "Arc");
};

const empty: Array<SegmentWithPrev> = [];

export const ShapeEditor = ({
	initial,
	onChange,
	children,
	allowOpen,
}: {
	initial: null | Array<SegmentWithPrev>;
	allowOpen?: boolean;
	onChange: (p: Array<SegmentWithPrev>) => void;
	children: (
		current: null | Array<SegmentWithPrev>,
		rendered: React.ReactNode,
	) => React.ReactNode;
}) => {
	const [current, setCurrent] = useInitialState(initial || empty);

	return (
		<div>
			<SegmentEditor
				initial={
					current.length
						? { prev: current[current.length - 1].segment.to }
						: null
				}
				onChange={(seg) => {
					const next = current.concat([seg]);
					setCurrent(next);
					if (allowOpen || validSegments(next)) {
						onChange(next);
					}
				}}
			>
				{(seg, rendered) =>
					children(
						current.concat(seg ? [seg] : []),
						<>
							{current.map((seg, i) => (
								<RenderSegmentBasic
									key={i}
									prev={seg.prev}
									segment={seg.segment}
									zoom={1}
									inner={{
										stroke: "white",
										strokeWidth: 1,
									}}
								/>
							))}
							{rendered}
						</>,
					)
				}
			</SegmentEditor>
			<button
				disabled={!current.length}
				onClick={() => setCurrent((c) => c.slice(0, -1))}
			>
				Back
			</button>
		</div>
	);
};
