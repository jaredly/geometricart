import { OrbitControls, PerspectiveCamera, useHelper } from "@react-three/drei";
import "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import React, { useMemo, useRef, useState } from "react";
import {
	CameraHelper,
	DirectionalLight,
	PerspectiveCamera as TPC,
} from "three";
import { BlurInt } from "../editor/Forms";
import { usePathsToShow } from "../editor/SVGCanvas";
import { Action } from "../state/Action";
import { PathGroup, State } from "../types";
// @ts-ignore
import { Hover } from "../editor/Sidebar";
import { mmToPX } from "../gcode/generateGcode";
import { calcShapes } from "./calcShapes";
import { ExportSection } from "./ExportSection";

export const useLatest = <T,>(value: T) => {
	const ref = useRef(value);
	ref.current = value;
	return ref;
};

export const ThreedScreen = ({
	state,
	dispatch,
	hover,
}: {
	state: State;
	dispatch: React.Dispatch<Action>;
	hover: Hover | null;
}) => {
	let { pathsToShow, selectedIds, clip, rand } = usePathsToShow(state);
	// const [thick, setThick] = useLocalStorage('thick', 3);
	// const [gap, setGap] = useLocalStorage('gap', 2);
	// const [toBack, setToBack] = useState(false as null | boolean);
	const {
		thickness = 3,
		gap = 0,
		shadowZoom = 0.09,
	} = state.meta.threedSettings ?? {};

	const toBack = false; // TODO make this customizeable? idkyyy

	const setShadowZoom = (shadowZoom: number) => {
		dispatch({
			type: "meta:update",
			meta: {
				...state.meta,
				threedSettings: { ...state.meta.threedSettings, shadowZoom },
			},
		});
	};

	const setThick = (thickness: number) => {
		dispatch({
			type: "meta:update",
			meta: {
				...state.meta,
				threedSettings: { ...state.meta.threedSettings, thickness },
			},
		});
	};

	const setGap = (gap: number) => {
		dispatch({
			type: "meta:update",
			meta: {
				...state.meta,
				threedSettings: { ...state.meta.threedSettings, gap },
			},
		});
	};

	const latestState = useLatest(state);

	React.useEffect(() => {
		const fn = (evt: KeyboardEvent) => {
			handleKey(evt, latestState.current, dispatch);
		};
		document.addEventListener("keydown", fn);
		return () => {
			document.removeEventListener("keydown", fn);
		};
	}, [state.selection]);

	const thickPX = mmToPX(thickness, state.meta.ppi);
	const gapPX = mmToPX(gap, state.meta.ppi);

	const { items, stls, backs, covers } = useMemo(() => {
		return calcShapes(
			pathsToShow,
			thickPX,
			gapPX,
			selectedIds,
			latestState.current,
			toBack,
			dispatch,
			hover,
		);
	}, [pathsToShow, thickPX, selectedIds, toBack, gapPX, hover]);

	const canv = React.useRef<HTMLCanvasElement>(null);
	const virtualCamera = React.useRef<TPC>();
	const sc = React.useRef<TPC>();

	const dl = useRef<DirectionalLight>(null);
	const [move, setMove] = useState(false);

	const [[x, y], setCpos] = useState<[number, number]>([0, 0]);

	// useEffect(() => {
	//     if (!move) return;
	//     let r = 0;
	//     const iv = setInterval(() => {
	//         const rad = 10;
	//         setCpos([Math.sin(r) * rad, Math.sin(r) * rad]);
	//         r += Math.PI / 30;
	//     }, 50);
	//     return () => clearInterval(iv);
	// }, [move]);

	const [lpos, setLpos] = useState<[number, number, number]>([3, 0, 100]);
	// const lpos = [0, 0, 10] as const;
	// useEffect(() => {
	//     let r = 0;
	//     const iv = setInterval(() => {
	//         r += Math.PI / 40;
	//         // setLpos([Math.cos(r) * 2, 0, 10]);
	//         setLpos([Math.cos(r) * 5, Math.sin(r) * 5, 10]);
	//     }, 100);
	//     return () => clearInterval(iv);
	// }, []);

	// useEffect(() => {
	//     const iv = setInterval(() => {
	//         if (!dl.current) return
	//         // dl.current.update
	//     }, 100)
	//     return () => clearInterval(iv)
	// }, [])

	const tmax = 100;
	const tmin = 0;

	const cdist = 70;
	const fov = 40;

	return (
		<div>
			<div
				style={{
					width: 1000,
					height: 1000,
					border: "1px solid magenta",
				}}
			>
				<Canvas
					ref={canv}
					shadows
					style={{ backgroundColor: "white" }}
					gl={{ antialias: true, preserveDrawingBuffer: true }}
				>
					<directionalLight
						position={lpos}
						ref={dl}
						shadow-mapSize={[2048 * 4, 2048 * 4]}
						// shadow-mapSize={[2048, 2048]}
						castShadow
					>
						<orthographicCamera
							zoom={shadowZoom}
							attach="shadow-camera"
						></orthographicCamera>
					</directionalLight>
					{/* {sc.current ? <cameraHelper camera={sc.current} /> : null} */}
					{/* <CH camera={sc} /> */}
					<ambientLight intensity={0.3} />

					<PerspectiveCamera
						makeDefault
						// @ts-expect-error
						ref={virtualCamera}
						position={[x, y, cdist]}
						args={[fov, 1, 1, 2000]}
					/>
					<OrbitControls camera={virtualCamera.current} />
					{items}
				</Canvas>
			</div>
			<div>
				<label>
					ShadowZoom
					<BlurInt
						value={shadowZoom}
						onChange={(t) => (t != null ? setShadowZoom(t) : null)}
					/>
				</label>
				<label>
					Thickness (mm)
					<BlurInt
						value={thickness}
						onChange={(t) => (t != null ? setThick(t) : null)}
					/>
				</label>
				<label>
					Gap (mm)
					<BlurInt
						value={gap}
						onChange={(t) => (t != null ? setGap(t) : null)}
					/>
				</label>
				{/* <label>
                    To Back
                    <button
                        disabled={toBack === true}
                        onClick={() => setToBack(true)}
                    >
                        All
                    </button>
                    <button
                        disabled={toBack === false}
                        onClick={() => setToBack(false)}
                    >
                        Top
                    </button>
                    <button
                        disabled={toBack === null}
                        onClick={() => setToBack(null)}
                    >
                        None
                    </button>
                </label> */}
				<button
					onClick={() => {
						setMove(!move);
						setCpos([0, 0]);
					}}
				>
					{move ? "Stop moving" : "Move"}
				</button>
			</div>
			<div>
				<div>Light pos</div>
				x
				<BlurInt
					value={lpos[0]}
					onChange={(t) => (t ? setLpos([t, lpos[1], lpos[2]]) : null)}
				/>
				y
				<BlurInt
					value={lpos[1]}
					onChange={(t) => (t ? setLpos([lpos[0], t, lpos[2]]) : null)}
				/>
				z
				<BlurInt
					value={lpos[2]}
					onChange={(t) => (t ? setLpos([lpos[0], lpos[1], t]) : null)}
				/>
			</div>
			<ExportSection
				canv={canv}
				state={state}
				stls={stls}
				backs={backs}
				covers={covers}
			/>
		</div>
	);
};

export function groupSort(a: PathGroup, b: PathGroup): number {
	return a.ordering == b.ordering
		? 0
		: a.ordering == null
			? b.ordering == null
				? 0
				: b.ordering >= 0
					? 1
					: -1
			: b.ordering == null
				? a.ordering >= 0
					? -1
					: 1
				: b.ordering - a.ordering;
}

const CH = ({ camera }: { camera: any }) => {
	useHelper(camera, CameraHelper);

	return null;
};

const handleKey = (
	evt: KeyboardEvent,
	state: State,
	dispatch: React.Dispatch<Action>,
) => {
	switch (evt.key) {
		case "ArrowUp":
		case "ArrowDown":
		case "PageUp":
		case "PageDown":
			break;
		default:
			return;
	}
	evt.preventDefault();
	evt.stopPropagation();
	if (state.selection?.type === "PathGroup") {
		if (state.selection.ids.length === 1) {
			const id = state.selection.ids[0];
			const hasPaths: Record<string, boolean> = {};
			Object.values(state.paths).forEach((p) =>
				p.group != null ? (hasPaths[p.group] = true) : null,
			);
			const groups = Object.values(state.pathGroups)
				.filter((g) => hasPaths[g.id])
				.sort((a, b) => groupSort(a, b));
			const at = groups.findIndex((g) => g.id === id);
			if (at === 0 && evt.key.endsWith("Up")) return;
			if (at === groups.length - 1 && evt.key.endsWith("Down")) return;
			const [got] = groups.splice(at, 1);
			switch (evt.key) {
				case "ArrowUp":
					groups.splice(at - 1, 0, got);
					break;
				case "ArrowDown":
					groups.splice(at + 1, 0, got);
					break;
				case "PageDown":
					groups.splice(groups.length, 0, got);
					break;
				case "PageUp":
					groups.splice(0, 0, got);
					break;
			}
			const order: Record<string, number> = {};
			groups.forEach((group, n) => {
				const i = groups.length - n;
				if (group.ordering !== i) {
					order[group.id] = i;
				}
			});
			console.log("reorder", order);
			dispatch({ type: "groups:order", order });
		}
	}
};
