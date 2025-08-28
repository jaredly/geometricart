/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from "@emotion/react";
import React from "react";
import { State, TimelineSlot } from "../types";

export const SlotEditor = ({
	item,
	onChange,
	state,
}: {
	item: TimelineSlot;
	onChange: (item: TimelineSlot) => void;
	state: State;
}) => {
	const contents = item.contents;
	if (contents.type === "spacer") {
		return (
			<>
				<div>
					{(["left", "right", null] as Array<"left" | "right" | null>).map(
						(still, i) => (
							<button
								key={i}
								disabled={contents.still == still}
								onClick={() =>
									onChange({
										...item,
										contents: { ...contents, still },
									})
								}
							>
								{still ?? "none"}
							</button>
						),
					)}
				</div>
			</>
		);
	}
	return (
		<>
			{
				<>
					<select
						value={contents.scriptId}
						onChange={(evt) => {
							onChange({
								...item,
								contents: {
									...contents,
									scriptId: evt.target.value,
								},
							});
						}}
					>
						{Object.keys(state.animations.scripts).map((key) => (
							<option key={key} value={key}>
								{key}
							</option>
						))}
						{!state.animations.scripts[contents.scriptId] ? (
							<option disabled value={contents.scriptId}>
								{contents.scriptId} (missing?)
							</option>
						) : null}
					</select>
					{contents.selection ? (
						<div>
							Current selection: {contents.selection.ids.length}{" "}
							{contents.selection.type}
							<button
								onClick={() => {
									onChange({
										...item,
										contents: {
											...contents,
											selection: undefined,
										},
									});
								}}
							>
								Clear selection
							</button>
						</div>
					) : (
						<div>
							No selection (will apply to all paths)
							<button
								disabled={!state.selection}
								onClick={() => {
									const sel = state.selection;
									if (sel?.type === "PathGroup" || sel?.type === "Path") {
										onChange({
											...item,
											contents: {
												...contents,
												selection: sel as any,
											},
										});
									}
								}}
							>
								Set current selection
							</button>
						</div>
					)}
				</>
			}
		</>
	);
};
