import * as React from "react";
import { Action } from "../state/Action";
import { State } from "../types";
import { Checkbox } from "primereact/checkbox";
import { Hover } from "../editor/Sidebar";
import { itemStyle } from "./NewSidebar";
import { Button } from "primereact/button";

export function MirrorItems({
	state,
	setHover,
	dispatch,
}: {
	state: State;
	setHover: (hover: Hover | null) => void;
	dispatch: React.Dispatch<Action>;
}): JSX.Element {
	return (
		<>
			{Object.entries(state.mirrors).map(([k, mirror]) => (
				<div
					key={k}
					className="field-radiobutton hover"
					style={itemStyle(false)}
					onMouseEnter={() =>
						setHover({
							type: "element",
							kind: "Mirror",
							id: k,
						})
					}
					onClick={() => {
						if (state.activeMirror !== k) {
							dispatch({
								type: "mirror:active",
								id: k,
							});
						} else {
							dispatch({
								type: "mirror:active",
								id: null,
							});
						}
					}}
					onMouseLeave={() => setHover(null)}
				>
					<Checkbox
						checked={state.activeMirror === k}
						inputId={k}
						onClick={(evt) => evt.stopPropagation()}
						onChange={(evt) => {
							if (state.activeMirror !== k) {
								dispatch({
									type: "mirror:active",
									id: k,
								});
							} else {
								dispatch({
									type: "mirror:active",
									id: null,
								});
							}
						}}
						name="mirror"
						value={k}
					/>
					<label
						htmlFor={k}
						onClick={(evt) => evt.stopPropagation()}
						style={{
							fontFamily: "monospace",
							fontSize: "80%",
							cursor: "pointer",
							flex: 1,
							display: "flex",
							alignItems: "center",
						}}
					>
						{mirror.rotational.length}x at {mirror.origin.x.toFixed(2)},
						{mirror.origin.y.toFixed(2)}
						<span style={{ flex: 1 }} />
						<Button
							onClick={() => {
								dispatch({
									type: "mirror:delete",
									id: k,
								});
							}}
							icon="pi pi-trash"
							className=" p-button-sm p-button-text p-button-danger"
							style={{ marginTop: -5, marginBottom: -6 }}
						/>
					</label>
				</div>
			))}
		</>
	);
}
