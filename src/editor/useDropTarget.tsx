import React from "react";
import { State, Tiling } from "../types";
import { migrateState } from "../state/migrateState";
import { readMetadata } from "png-metadata";
import { PREFIX, SUFFIX } from "./Sidebar";
import { initialState } from "../state/initialState";

export const useDropTarget = (
	onDrop: (file: File) => void,
): [
	boolean,
	{
		onDragOver: (evt: React.DragEvent) => void;
		onDrop: (evt: React.DragEvent) => void;
	},
] => {
	const [dragging, setDragging] = React.useState(false);

	const tid = React.useRef(null as null | NodeJS.Timeout);

	const callbacks = {
		onDragOver: (evt: React.DragEvent) => {
			evt.stopPropagation();
			setDragging(true);
			evt.preventDefault();
			if (tid.current) {
				clearTimeout(tid.current);
				tid.current = null;
			}
			tid.current = setTimeout(() => {
				setDragging(false);
			}, 300);
		},
		onDrop: (evt: React.DragEvent) => {
			evt.stopPropagation();
			evt.preventDefault();
			setDragging(false);
			onDrop(evt.dataTransfer.files[0]);
		},
	};
	return [dragging, callbacks];
};

export const useDropStateTarget = (onDrop: (state: State | null) => void) => {
	return useDropTarget((file) => {
		getStateFromFile(
			file,
			(state) => {
				if (state) {
					onDrop(migrateState(state));
				} else {
					onDrop(null);
				}
			},
			null,
			(err) => {
				console.log(err);
				alert(err);
			},
		);
	});
};

export const useDropStateOrAttachmentTarget = (
	onDrop: (state: State) => void,
	onDropAttachment: (name: string, src: string, w: number, h: number) => void,
) => {
	return useDropTarget((file) => {
		getStateFromFile(
			file,
			(state) => {
				if (state) {
					onDrop(migrateState(state));
				}
			},
			onDropAttachment,
			(err) => {
				console.log(err);
				alert(err);
			},
		);
	});
};

export const getStateFromFile = (
	file: File,
	done: (s: State | null) => void,
	attachment:
		| null
		| ((name: string, src: string, w: number, h: number) => void),
	err: (message: string) => void,
) => {
	if (file.type === "image/jpeg") {
		if (attachment) {
			return parseAttachment(attachment, file, err);
		} else {
			done(null);
		}
	} else if (file.type === "image/png") {
		const reader = new FileReader();
		reader.onload = () => {
			const buffer = new Uint8Array(reader.result as ArrayBuffer);
			const meta = readMetadata(buffer);
			if (meta && meta.tEXt && meta.tEXt["GeometricArt"]) {
				done(JSON.parse(meta.tEXt["GeometricArt"]));
			} else if (attachment) {
				console.log("nope");
				parseAttachment(attachment, file, err);
			} else {
				done(null);
			}
		};
		reader.readAsArrayBuffer(file);
	} else if (file.type === "image/svg+xml") {
		const reader = new FileReader();
		reader.onload = () => {
			const raw = reader.result as string;
			const last = raw.split("\n").slice(-1)[0].trim();
			if (last.startsWith(PREFIX) && last.endsWith(SUFFIX)) {
				done(JSON.parse(last.slice(PREFIX.length, -SUFFIX.length)));
			} else {
				const TPREFIX = "<!-- TILING:";
				const TSUFFIX = "-->";
				if (raw.includes(TPREFIX) && raw.includes(TSUFFIX)) {
					const tiling: Tiling = JSON.parse(
						raw.slice(
							raw.indexOf(TPREFIX) + TPREFIX.length,
							raw.indexOf(TSUFFIX),
						),
					);
					done({ ...initialState, tilings: { [tiling.id]: tiling } });
				} else {
					console.log("not last, bad news");
					console.log(last);
					done(null);
				}
			}
		};
		reader.readAsText(file);
	} else if (file.type === "text/plain" || file.type === "text/x-gcode") {
		const reader = new FileReader();
		reader.onload = () => {
			// debugger;
			const lines = (reader.result as string).split(";; ** STATE **\n;; ");
			if (lines.length > 1) {
				done(JSON.parse(lines[1].split("\n")[0]));
			} else {
				console.log("no state sorry");
				done(null);
			}
			// if (last.startsWith(PREFIX) && last.endsWith(SUFFIX)) {
			//     done(JSON.parse(last.slice(PREFIX.length, -SUFFIX.length)));
			// } else {
			//     console.log('not last, bad news');
			//     console.log(last);
			//     done(null);
			// }
		};
		reader.readAsText(file);
	}
	console.log("nopes", file.type);
};

export function parseAttachment(
	attachment: (name: string, src: string, w: number, h: number) => void,
	file: File,
	err: (message: string) => void,
) {
	const stringReader = new FileReader();
	stringReader.onload = () => {
		var base64data = stringReader.result as string;
		const image = new Image();
		image.src = base64data;
		image.onload = () => {
			attachment(
				file.name,
				base64data,
				image.naturalWidth,
				image.naturalHeight,
			);
		};
		image.onerror = () => {
			err("Unable to load base64 image");
		};
	};
	stringReader.onerror = () => {
		err("error");
	};
	stringReader.readAsDataURL(file);
}
