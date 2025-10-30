import * as React from 'react';
import {texture1, texture2} from '../rendering/textures';
import {State} from '../types';
import {setup} from './RenderWebGL.setup.related';

export const RenderWebGL = ({
    state,
    texture,
    width,
    height,
}: {
    state: State;
    texture: {id: string; scale: number; intensity: number};
    width: number;
    height: number;
}) => {
    const ref = React.useRef(null as null | HTMLCanvasElement);
    // const [time, setTime] = React.useState(null as null | [number, number]);
    React.useEffect(() => {
        const ctx = ref.current!.getContext('webgl2')!;

        // const start = performance.now();
        // const [count, shader] = shaderForState(state);
        // console.log(shader);
        const fns: {
            [key: string]: (scale: number, intensity: number) => string;
        } = {texture1: texture1, texture2: texture2};
        const fn = fns[texture.id];
        if (!fn) {
            return;
        }
        setup(ctx, fn(texture.scale, texture.intensity), 0);
        // const end = performance.now();
        // setTime([count, end - start]);
    }, [texture]);
    return (
        <canvas
            ref={ref}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                // width: 400,
                backgroundColor: 'transparent',
                pointerEvents: 'none',
            }}
        />
    );
};

/*

float cro( in vec2 a, in vec2 b ) { return a.x*b.y - a.y*b.x; }
vec3 sdgQuad( in vec2 p, in vec2 v[4] )
{
    float gs = cro(v[0]-v[3],v[1]-v[0]);
    vec4 res;

    // edge 0
    {
    vec2  e = v[1]-v[0];
    vec2  w = p-v[0];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q);
    float s = gs*cro(w,e);
    res = vec4(d,q,s);
    }

    // edge 1
    {
	vec2  e = v[2]-v[1];
    vec2  w = p-v[1];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q);
    float s = gs*cro(w,e);
    res = vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
    }

    // edge 2
    {
	vec2  e = v[3]-v[2];
    vec2  w = p-v[2];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q);
    float s = gs*cro(w,e);
    res = vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
    }

    // edge 3
    {
    vec2  e = v[0]-v[3];
    vec2  w = p-v[3];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q);
    float s = gs*cro(w,e);
    res = vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
    }

    // distance and sign
    float d = sqrt(res.x)*sign(res.w);

    return vec3(d,res.yz/d);
}

*/





// Many thanks to https://github.com/tsherif/webgl2examples/

export const bl = [-1.0, -1.0, 0.0];
export const br = [1.0, -1.0, 0.0];
export const tr = [1.0, 1.0, 0.0];
export const tl = [-1.0, 1.0, 0.0];

