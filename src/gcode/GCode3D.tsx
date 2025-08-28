import * as React from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
	Camera,
	CanvasTexture,
	DoubleSide,
	LinearFilter,
	Mesh,
	RepeatWrapping,
	ShaderMaterial,
	Texture,
	TextureLoader,
	Vector3,
} from "three";
import { GCodeData } from "./Visualize";
import { renderCutDepths } from "./renderCutDepths";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { addMetadata } from "../editor/ExportPng";
import { initialHistory } from "../state/initialState";
import { State } from "../types";
import { gcodeStateSuffix } from "./Toolbar";

// Based on https://stemkoski.github.io/Three.js/Shader-Heightmap-Textures.html
const vertext = `
uniform sampler2D bumpTexture;
uniform float bumpScale;

varying vec2 vUV;
varying vec3 vNormal;
varying vec4 vNormalColor;

void main() {
	vUV = uv;
	vec4 bumpData = texture2D( bumpTexture, uv );

    float off = 0.001;

	vec4 p1 = texture2D( bumpTexture, uv + vec2(off, 0.0) );
	vec4 p5 = texture2D( bumpTexture, uv + vec2(-off, 0.0) );

	vec4 p3 = texture2D( bumpTexture, uv + vec2(0.0, off) );
	vec4 p7 = texture2D( bumpTexture, uv + vec2(0.0, -off) );

    float dzdx = (p5.r - p1.r);
    float dzdy = (p7.r - p3.r);

    vec3 tx = vec3(1.0, 0.0, dzdx);
    vec3 ty = vec3(0.0, 1.0, dzdy);
    // Calculate the normal
    vNormal = normalize(cross(tx, ty));
    vNormalColor = vec4(vNormal * 0.5 + 0.5, 1.0);

    // Hmm I wonder if I could


	// move the position along the normal
    vec3 newPosition = position + normal * bumpScale * bumpData.r;

	gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
}
`;

const fragment = `
uniform sampler2D bumpTexture;
uniform sampler2D backgroundTexture;
varying vec2 vUV;
varying vec3 vNormal;
varying vec4 vNormalColor;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
	vec4 bumpData = texture2D( bumpTexture, vUV );
    float amount = bumpData.r;
    vec4 depthColor = vec4(vec3(amount), 1.0);

    if (bumpData.r < 0.001) {
        discard;
    }

    float off = 0.001;

	vec4 p1 = texture2D( bumpTexture, vUV + vec2(off, 0.0) );
	vec4 p5 = texture2D( bumpTexture, vUV + vec2(-off, 0.0) );

	vec4 p3 = texture2D( bumpTexture, vUV + vec2(0.0, off) );
	vec4 p7 = texture2D( bumpTexture, vUV + vec2(0.0, -off) );

    float dzdx = abs(p5.r - p1.r);
    float dzdy = abs(p7.r - p3.r);

    float angle = 1.0 - max(dzdx, dzdy) * 10.0;
    vec4 angleColor = vec4(vec3(angle), 1.0);

    vec4 normalColor = mix(vNormalColor, angleColor, 0.8);

	vec4 backgroundColor = texture2D( backgroundTexture, vUV );
    // vec4 backgroundColor = vec4(123.0 / 255.0, 50.0 / 255.0, 0.0 / 255.0, 1.0);

    gl_FragColor = mix(backgroundColor, mix(depthColor, normalColor, 0.2), 0.7);
}
`;

export const GCode3D = ({
	data,
	gcode,
	state,
	meta,
}: {
	data: GCodeData;
	gcode: string;
	state: State;
	meta: string;
}) => {
	const [scaleBase, setScaleBase] = React.useState(500);
	const scale = scaleBase / Math.max(data.dims.width, data.dims.height);
	const tx = React.useMemo(() => {
		console.log("rerender the canvas");
		const canvas = document.createElement("canvas");
		const rscale = scale;
		canvas.width = data.dims.width * rscale;
		canvas.height = data.dims.height * rscale;
		const ctx = canvas.getContext("2d")!;
		ctx.fillStyle = "rgb(255, 0, 0)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.scale(rscale, rscale);
		ctx.translate(-data.bounds.min.x!, -data.bounds.min.y!);
		renderCutDepths(ctx, data, true);
		ctx.restore();
		const tx = new CanvasTexture(canvas);
		tx.wrapS = RepeatWrapping;
		tx.wrapT = RepeatWrapping;
		return tx;
	}, [data, scale]);

	const cam = React.useRef(null as null | Camera | void);
	const canv = React.useRef<HTMLCanvasElement>(null);
	const stateRef = React.useRef(null as null | any);
	const [download, setDownload] = React.useState(
		null as null | { url: string; img: string },
	);
	const qsize = 500;
	const virtualCamera = React.useRef<Camera>();

	return (
		<div>
			<button
				onClick={() => {
					if (download) {
						setDownload(null);
						return;
					}
					const dest = document.createElement("canvas");
					dest.width = dest.height = qsize * 2;

					const ctx = dest.getContext("2d")!;
					const threes = stateRef.current;
					ctx.fillStyle = "#00ffca";
					ctx.fillRect(0, 0, dest.width, dest.height);

					takePerspectivePictures(threes, ctx, canv, qsize);

					const textHeight = 15;
					const textMargin = 5;

					ctx.fillStyle = "white";
					ctx.fillRect(0, qsize * 2 - textHeight - textMargin, qsize * 2, 50);
					ctx.font = `${textHeight}px system-ui`;
					ctx.fillStyle = "black";
					ctx.fillText(meta, textMargin, qsize * 2 - textMargin);

					const url = dest.toDataURL();
					const blob = new Blob(
						[gcode + gcodeStateSuffix(state) + `\n;thumbnail: ${url}`],
						{
							type: "text/x-gcode",
						},
					);
					setDownload({ url: URL.createObjectURL(blob), img: url });
				}}
			>
				{download ? "Clear" : "Download GCode w/ Preview Image"}
			</button>
			{download ? (
				<div>
					<a
						href={download.url}
						style={{ cursor: "pointer" }}
						download={`geometric-${new Date().toISOString()}.nc`}
					>
						<img src={download.img} style={{ width: qsize, height: qsize }} />
					</a>
				</div>
			) : null}
			<div>
				{[500, 1000, 2000, 5000].map((num) => (
					<button
						key={num}
						onClick={() => setScaleBase(num)}
						disabled={scaleBase === num}
					>
						{num}
					</button>
				))}
			</div>
			<div style={{ width: 500, height: 500, border: "1px solid magenta" }}>
				<Canvas ref={canv} style={{ backgroundColor: "black" }}>
					<ambientLight />
					<pointLight position={[10, 10, 10]} />
					<VBox tx={tx} data={data} scale={scale} />
					<GetState ok={stateRef} />
					<PerspectiveCamera
						makeDefault
						// @ts-expect-error
						ref={virtualCamera}
						position={[0, 0, 10]}
						args={[30, 1, 1, 1000]}
					/>
					<OrbitControls camera={virtualCamera.current} />
				</Canvas>
			</div>
		</div>
	);
};

const GetState = ({ ok }: { ok: React.MutableRefObject<any> }) => {
	const state = useThree();
	ok.current = state;
	return null;
};

export function takePerspectivePictures(
	threes: any,
	ctx: CanvasRenderingContext2D,
	canv: React.RefObject<HTMLCanvasElement>,
	qsize: number,
) {
	threes.camera.position.set(0, 0, 10);
	threes.camera.lookAt(new Vector3(0, 0, 0));
	threes.gl.render(threes.scene, threes.camera);
	ctx.drawImage(canv.current!, 0, 0, qsize, qsize);

	threes.camera.position.x = 4;
	threes.camera.position.z = 7;
	threes.camera.lookAt(new Vector3(0, 0, 0));
	threes.gl.render(threes.scene, threes.camera);
	ctx.drawImage(canv.current!, qsize, 0, qsize, qsize);

	threes.camera.position.z = -3;
	threes.camera.position.x = -5;
	threes.camera.lookAt(new Vector3(-0.5, 0, 0));
	threes.gl.render(threes.scene, threes.camera);
	ctx.drawImage(canv.current!, 0, qsize, qsize, qsize);

	threes.camera.position.x = -4;
	threes.camera.position.y = 4;
	threes.camera.position.z = 4;
	threes.camera.lookAt(new Vector3(0, 0, 0));
	threes.gl.render(threes.scene, threes.camera);
	ctx.drawImage(canv.current!, qsize, qsize, qsize, qsize);

	// Reset
	threes.camera.position.set(0, 0, 10);
	threes.camera.lookAt(new Vector3(0, 0, 0));
}

function VBox({
	tx,
	data,
	scale,
}: {
	tx: Texture;
	data: GCodeData;
	scale: number;
}) {
	const mesh = React.useRef<Mesh>(null);
	const wood = useLoader(TextureLoader, "wood.jpg");

	const modelWidth = 5;
	const modelHeight = (data.dims.height / data.dims.width) * modelWidth;
	const modelDepth = (data.dims.depth / data.dims.width) * modelWidth;

	const mat = React.useMemo(() => {
		const customUniforms = {
			backgroundTexture: { type: "t", value: wood },
			bumpTexture: { type: "t", value: tx },
			bumpScale: { type: "f", value: modelDepth },
		};
		const mat = new ShaderMaterial({
			uniforms: customUniforms,
			vertexShader: vertext,
			fragmentShader: fragment,
			side: DoubleSide,
		});
		return mat;
	}, [tx, modelDepth]);

	return (
		<mesh ref={mesh} material={mat} position={[0, 0, -modelDepth]}>
			{/* <meshBasicMaterial material={tx} toneMapped={false} /> */}
			{/* <boxGeometry args={[2, 2, 2]} /> */}
			<planeGeometry
				args={[
					modelWidth,
					modelHeight,
					data.dims.width * scale,
					data.dims.height * scale,
				]}
			/>
		</mesh>
	);
}
