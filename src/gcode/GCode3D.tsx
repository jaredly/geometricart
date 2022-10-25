import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    CanvasTexture,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    RepeatWrapping,
    ShaderMaterial,
    Texture,
} from 'three';
import { GCodeData, renderCutDepths } from './Visualize';
import { OrbitControls } from '@react-three/drei';

// Based on https://stemkoski.github.io/Three.js/Shader-Heightmap-Textures.html
const vertext = `
uniform sampler2D bumpTexture;
uniform float bumpScale;

varying vec2 vUV;

void main() { 
	vUV = uv;
	vec4 bumpData = texture2D( bumpTexture, uv );
	
	// move the position along the normal
    vec3 newPosition = position + normal * bumpScale * bumpData.r;
	
	gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
}
`;

const fragment = `
uniform sampler2D bumpTexture;
varying vec2 vUV;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
	vec4 bumpData = texture2D( bumpTexture, vUV );
	// gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(bumpTexture, vUV);
    float amount = fract(bumpData.r * 2.0);
	// gl_FragColor = vec4(hsv2rgb(vec3(amount, 1.0, 1.0)), 1.0);
    gl_FragColor = vec4(vec3(amount), 1.0);
}  
`;

export const GCode3D = ({
    data,
}: {
    // canvas,
    // canvas: React.RefObject<HTMLCanvasElement>;
    data: GCodeData;
}) => {
    const scale = 1000 / Math.max(data.dims.width, data.dims.height);
    const tx = React.useMemo(() => {
        console.log('rerender the canvas');
        const canvas = document.createElement('canvas');
        canvas.width = data.dims.width * scale;
        canvas.height = data.dims.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'hsl(0, 100%, 100%)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-data.bounds.min.x!, -data.bounds.min.y!);
        renderCutDepths(ctx, 3, data, true);
        ctx.restore();
        const tx = new CanvasTexture(canvas);
        tx.wrapS = RepeatWrapping;
        tx.wrapT = RepeatWrapping;
        // tx.repeat.set(1 / width, 1 / height);
        return tx;
    }, [data]);

    return (
        <div style={{ width: 500, height: 500, border: '1px solid magenta' }}>
            <Canvas>
                <ambientLight />
                <pointLight position={[10, 10, 10]} />
                <VBox tx={tx} data={data} scale={scale} />
                <OrbitControls />
            </Canvas>
        </div>
    );
};

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

    const modelWidth = 5;
    const modelHeight = (data.dims.height / data.dims.width) * modelWidth;
    const modelDepth = (data.dims.depth / data.dims.width) * modelWidth;

    const mat = React.useMemo(() => {
        const customUniforms = {
            bumpTexture: { type: 't', value: tx },
            bumpScale: { type: 'f', value: modelDepth },
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
        <mesh ref={mesh} material={mat}>
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

function Box(props: JSX.IntrinsicElements['mesh']) {
    const mesh = React.useRef<Mesh>(null);
    const [hovered, setHover] = React.useState(false);
    const [active, setActive] = React.useState(false);
    useFrame((state, delta) => (mesh.current!.rotation.x += 0.01));
    return (
        <mesh
            {...props}
            ref={mesh}
            scale={active ? 1.5 : 1}
            onClick={(event) => setActive(!active)}
            onPointerOver={(event) => setHover(true)}
            onPointerOut={(event) => setHover(false)}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
        </mesh>
    );
}
