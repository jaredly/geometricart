import {useThree, useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import {DirectionalLight} from 'three';

export function OrbitingCamera({
    radius,
    target = [0, 0, 0],
}: {
    radius: number;
    target: [number, number, number];
}) {
    const {camera, scene} = useThree();
    const angleRef = useRef(Math.PI / 2);

    useFrame((state, delta) => {
        angleRef.current += delta * 0.5; // speed

        camera.position.x = radius * Math.cos(angleRef.current) + target[0];
        camera.position.z = radius * Math.sin(angleRef.current) + target[2];
        camera.position.y = target[1];
        camera.lookAt(...target);

        const light: DirectionalLight = scene.getObjectByName('dirlight') as DirectionalLight;
        if (light) {
            const off = Math.PI / 8;
            light.position.copy(camera.position);
            light.position.set(
                radius * Math.cos(angleRef.current + off) + target[0],
                target[1],
                radius * Math.sin(angleRef.current + off) + target[2],
            );
            light.target.position.set(...target);
            light.target.updateMatrixWorld();
        }
    });

    return null; // this is a "controller" component
}
