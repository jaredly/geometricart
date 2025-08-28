/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from "@emotion/react";
import React from "react";
import { EyeIcon, EyeInvisibleIcon } from "../icons/Eyes";
import {
	BringToFrontIcon,
	DeleteForeverIcon,
	IconButton,
	ImagesIcon,
	LibraryAddIcon,
	SendToBackIcon,
} from "../icons/Icon";
import { Hover } from "./Sidebar";
import { State } from "../types";
import { Action } from "../state/Action";
import { parseAttachment } from "./useDropTarget";

export const openFile = (onSuccess: (files: FileList | null) => void) => {
	const input = document.createElement("input");
	input.type = "file";
	document.body.appendChild(input);
	input.style.display = "none";
	input.oninput = (evt) => {
		const files = (evt.target as HTMLInputElement).files;
		onSuccess(files);
		input.remove();
	};
	input.click();
};

export const OverlayMenu = ({
	state,
	dispatch,
	setHover,
}: {
	state: State;
	dispatch: (a: Action) => void;
	setHover: (h: Hover | null) => void;
}) => {
	const [open, setOpen] = React.useState(false);
	return (
		<div
			css={{
				position: "absolute",
				top: 0,
				left: 0,
			}}
		>
			<IconButton
				onClick={() => {
					setOpen((o) => !o);
				}}
				css={
					{
						// width: 58,
						// height: 58,
						// display: 'flex',
						// alignItems: 'center',
						// justifyContent: 'center',
					}
				}
				selected={open}
			>
				<ImagesIcon />
				{/* {state.selection?.type === 'Overlay'
                        ? 'Deselect overlay'
                        : 'Select overlay'} */}
			</IconButton>
			{open ? (
				<div>
					{Object.keys(state.overlays).map((k) => (
						<div
							css={{
								cursor: "pointer",
								position: "relative",
							}}
							// TODO: On hover, show it, please
							onClick={() => {
								if (
									state.selection?.type === "Overlay" &&
									state.selection.ids?.includes(k)
								) {
									dispatch({
										type: "selection:set",
										selection: null,
									});
								} else {
									dispatch({
										type: "selection:set",
										selection: {
											type: "Overlay",
											ids: [k],
										},
									});
								}
							}}
						>
							<img
								src={state.attachments[state.overlays[k].source].contents}
								css={{
									objectFit: "cover",
									width: 58,
									height: 58,
									border:
										state.selection?.type === "Overlay" &&
										state.selection?.ids.includes(k)
											? "4px solid white"
											: "none",
								}}
							/>
							<div
								css={{
									display: "flex",
									flexDirection: "row",
									position: "absolute",
									top: 0,
									left: 58,
								}}
							>
								<IconButton
									onClick={() => {
										dispatch({
											type: "overlay:update",
											overlay: {
												...state.overlays[k],
												hide: !state.overlays[k].hide,
											},
										});
										setOpen(false);
										setHover(null);
									}}
									onMouseOver={() =>
										setHover({
											kind: "Overlay",
											id: k,
											type: "element",
										})
									}
									onMouseOut={() => setHover(null)}
									hoverIcon={
										!state.overlays[k].hide ? <EyeInvisibleIcon /> : <EyeIcon />
									}
								>
									{state.overlays[k].hide ? <EyeInvisibleIcon /> : <EyeIcon />}
								</IconButton>
								{!state.overlays[k].hide ? (
									<IconButton
										onClick={() => {
											dispatch({
												type: "overlay:update",
												overlay: {
													...state.overlays[k],
													over: !state.overlays[k].over,
												},
											});
											setOpen(false);
											setHover(null);
										}}
										hoverIcon={
											!state.overlays[k].over ? (
												<BringToFrontIcon />
											) : (
												<SendToBackIcon />
											)
										}
									>
										{state.overlays[k].over ? (
											<BringToFrontIcon />
										) : (
											<SendToBackIcon />
										)}
									</IconButton>
								) : null}
								<IconButton
									onClick={() => {
										dispatch({
											type: "overlay:delete",
											id: k,
										});
										setOpen(false);
										setHover(null);
									}}
								>
									<DeleteForeverIcon />
								</IconButton>
							</div>
						</div>
					))}
					<IconButton
						onClick={() => {
							openFile((files) => {
								console.log(files);
								if (files?.length) {
									parseAttachment(
										(name, contents, width, height) => {
											const id = Math.random().toString(36).slice(2);
											dispatch({
												type: "attachment:add",
												attachment: {
													id,
													contents,
													height,
													width,
													name,
												},
												id,
											});
											dispatch({
												type: "overlay:add",
												attachment: id,
											});
										},
										files[0],
										(err) => {
											alert(`Failed to parse image: ${err}`);
										},
									);
								}
							});
							// setOpen((o) => !o);
						}}
						css={
							{
								// width: 58,
								// height: 58,
								// display: 'flex',
								// alignItems: 'center',
								// justifyContent: 'center',
							}
						}
					>
						<LibraryAddIcon />
						{/* {state.selection?.type === 'Overlay'
                        ? 'Deselect overlay'
                        : 'Select overlay'} */}
					</IconButton>
				</div>
			) : null}
		</div>
	);
};
