import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    CanvasTexture,
    Mesh,
    MeshBasicMaterial,
    RepeatWrapping,
    Texture,
} from 'three';
import { GCodeData, renderCutDepths } from './Visualize';
import { OrbitControls } from '@react-three/drei';

export const GCode3D = ({
    data,
}: {
    // canvas,
    // canvas: React.RefObject<HTMLCanvasElement>;
    data: GCodeData;
}) => {
    const tx = React.useMemo(() => {
        const canvas = document.createElement('canvas');
        const scale = 5;
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
    }, []);
    return (
        <div style={{ width: 500, height: 500, border: '1px solid magenta' }}>
            <Canvas>
                <ambientLight />
                <pointLight position={[10, 10, 10]} />
                <VBox tx={tx} />
                <OrbitControls />
            </Canvas>
        </div>
    );
};

function VBox({ tx }: { tx: Texture }) {
    const mesh = React.useRef<Mesh>(null);
    useFrame((state, delta) => (mesh.current!.rotation.x += 0.01));

    return (
        <mesh ref={mesh}>
            <meshBasicMaterial map={tx} toneMapped={false} />
            <boxGeometry args={[2, 2, 2]} />
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
