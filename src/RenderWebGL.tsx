import * as React from 'react';
import { shaderForState } from './shaderForState';
import { State } from './types';

export const RenderWebGL = ({ state }: { state: State }) => {
    const ref = React.useRef(null as null | HTMLCanvasElement);
    const [time, setTime] = React.useState(null as null | [number, number]);
    React.useEffect(() => {
        const ctx = ref.current!.getContext('webgl2')!;

        const defaultFrag = `#version 300 es

precision mediump float;

out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;


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

void main() {
	vec2 p = (-u_resolution.xy + 2.0*gl_FragCoord.xy)/u_resolution.y;

vec2 v[4] = vec2[4](
            vec2(-0.9,-0.5),
            vec2( 0.2,-0.5),
            vec2( 0.9, 0.5),
            vec2(-0.9, 0.5));

			vec3  dg = sdgQuad(p,v);

	if (dg.x < 0.0) {
	
		fragColor = vec4(1.00000, mod(dg.x * 10.0, 1.0), 0.00000, 1.00000);	
	} else {

		fragColor = vec4(1.00000, 1.00000, 0.00000, 1.00000);
	}

}`;

        const start = performance.now();
        const [count, shader] = shaderForState(state);
        // console.log(shader);
        setup(ctx, shader, 0);
        const end = performance.now();
        setTime([count, end - start]);
    }, []);
    return (
        <div>
            <canvas
                ref={(node) => (ref.current = node)}
                width="1000"
                height="1000"
                style={{ width: 400 }}
            />
            {time != null
                ? `${time[0]} paths took ${time[1].toFixed(0)}ms to render, ${
                      time[1] / time[0]
                  }ms per path`
                : 'no time yet'}
        </div>
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

const createShader = (
    gl: WebGL2RenderingContext,
    kind: number,
    source: string,
) => {
    const shader = gl.createShader(kind);
    if (!shader) {
        // TODO: Indicate in the UI that this is probably just the browser limiting stuff
        throw new Error(`no shader`);
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        const error = gl.getShaderInfoLog(shader);
        // console.error(error);
        gl.deleteShader(shader);
        const err = new Error(`Not compiled: ` + error);
        // @ts-ignore
        err.shader = source;
        throw err;
    }

    return shader;
};

const makeTextureAndStuff = (
    gl: WebGL2RenderingContext,
    i: number,
    textures: Array<BufferInfo>,
): BufferInfo => {
    if (textures[i]) {
        return textures[i];
    }
    const targetTextureWidth = gl.canvas.width;
    const targetTextureHeight = gl.canvas.height;
    const texture = gl.createTexture();
    // if (!texture) {
    //     throw new Error(`Unable to make texture`);
    // }
    // textures[i] = texture;
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        targetTextureWidth,
        targetTextureHeight,
        border,
        format,
        type,
        data,
    );

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    // gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // gl.framebufferTexture2D(
    //     gl.FRAMEBUFFER,
    //     gl.COLOR_ATTACHMENT0,
    //     gl.TEXTURE_2D,
    //     texture,
    //     level,
    // );

    textures[i] = { fb: fb!, texture: texture!, i };
    return textures[i];
};

const defaultVertextShader = `#version 300 es
layout (location=0) in vec4 position;

void main() {
    gl_Position = position;
}`;

export type BufferInfo = {
    fb: WebGLFramebuffer;
    texture: WebGLTexture;
    i: number;
};

// Many thanks to https://github.com/tsherif/webgl2examples/
export const setup = (
    gl: WebGL2RenderingContext,
    fragmentShader: string,
    currentTime: number,
    mousePos?: { x: number; y: number; button: number },
    // state?: { value: unknown; type: Reference; env: Env },
    bufferShaders: Array<string> = [],
    textures: Array<BufferInfo> = [],
) => {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    const vertex = createShader(gl, gl.VERTEX_SHADER, defaultVertextShader);
    const program = gl.createProgram();
    if (!program) {
        throw new Error(`No program`);
    }
    gl.attachShader(program, fragment);
    gl.attachShader(program, vertex);
    gl.linkProgram(program);
    gl.validateProgram(program);
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        throw new Error('Failed ot link');
    }
    gl.deleteShader(fragment);
    gl.deleteShader(vertex);

    type Bound = {
        utime: WebGLUniformLocation;
        umouse: WebGLUniformLocation;
        umousebutton: WebGLUniformLocation;
        // ustate: null | ((value: unknown) => void);
        textureLocs: Array<WebGLUniformLocation>;
    };

    const bindUniforms = (program: WebGLProgram): Bound => {
        const textureLocs: Array<WebGLUniformLocation> = [];
        for (let i = 0; i < bufferShaders.length; i++) {
            const loc = gl.getUniformLocation(program, `u_buffer${i}`);
            gl.uniform1i(loc, i);
            textureLocs.push(loc!);
        }

        const utime = gl.getUniformLocation(program, 'u_time')!;
        gl.uniform1f(utime, currentTime);

        const uresolution = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(uresolution, gl.canvas.width, gl.canvas.height);

        const umousebutton = gl.getUniformLocation(program, 'u_mousebutton')!;
        if (mousePos) {
            gl.uniform1i(umousebutton, mousePos.button);
        }

        const umouse = gl.getUniformLocation(program, 'u_mouse')!;
        if (mousePos) {
            gl.uniform2f(umouse, mousePos.x, mousePos.y);
        }

        return { utime, umouse, umousebutton, textureLocs };
    };

    const bufferPrograms = bufferShaders.map((fragmentShader) => {
        const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
        const vertex = createShader(gl, gl.VERTEX_SHADER, defaultVertextShader);
        const program = gl.createProgram();
        if (!program) {
            throw new Error(`No program`);
        }
        gl.attachShader(program, fragment);
        gl.attachShader(program, vertex);
        gl.linkProgram(program);
        gl.validateProgram(program);
        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked) {
            console.error(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            throw new Error('Failed ot link');
        }
        gl.deleteShader(fragment);
        gl.deleteShader(vertex);
        gl.useProgram(program);
        return { program, bound: bindUniforms(program) };
    });

    let frameBuffers: Array<BufferInfo> = [];
    let backBuffers: Array<BufferInfo> = [];

    for (let i = 0; i < bufferShaders.length; i++) {
        frameBuffers.push(makeTextureAndStuff(gl, i, textures));
        backBuffers.push(
            makeTextureAndStuff(gl, bufferShaders.length + i, textures),
        );
    }

    const swap = () => {
        const tmp = frameBuffers;
        frameBuffers = backBuffers;
        backBuffers = tmp;
    };

    gl.useProgram(program);
    const bound = bindUniforms(program);

    var triangleArray = gl.createVertexArray();
    gl.bindVertexArray(triangleArray);

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    bufferPrograms.forEach(({ program, bound }, i) => {
        gl.useProgram(program);

        bound.textureLocs.forEach((loc, i) => {
            gl.uniform1i(loc, backBuffers[i].i);
        });

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[i].fb);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            frameBuffers[i].texture,
            0,
        );
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // const bound = bindUniforms(program);
    });

    gl.useProgram(program);

    bound.textureLocs.forEach((loc, i) => {
        gl.uniform1i(loc, frameBuffers[i].i);
    });

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // clear & draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    return (
        uTime: number,
        mousePos?: { x: number; y: number; button: number },
        state?: unknown,
    ) => {
        swap();
        if (bufferPrograms.length) {
            bufferPrograms.forEach(({ program, bound }, i) => {
                gl.useProgram(program);

                gl.uniform1f(bound.utime, uTime);

                if (mousePos) {
                    gl.uniform2f(bound.umouse, mousePos.x, mousePos.y);
                    gl.uniform1i(bound.umousebutton, mousePos.button);
                }

                // if (state && bound.ustate) {
                //     bound.ustate(state);
                // }

                bound.textureLocs.forEach((loc, i) => {
                    gl.uniform1i(loc, backBuffers[i].i);
                });

                gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[i].fb);
                gl.framebufferTexture2D(
                    gl.FRAMEBUFFER,
                    gl.COLOR_ATTACHMENT0,
                    gl.TEXTURE_2D,
                    frameBuffers[i].texture,
                    0,
                );
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });

            gl.useProgram(program);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        gl.uniform1f(bound.utime, uTime);

        // TODO: Need to handle many different state types
        // if (state && bound.ustate) {
        //     bound.ustate(state);
        //     // gl.uniform2f(bound.ustate, state.x, state.y);
        // }

        if (mousePos) {
            gl.uniform2f(bound.umouse, mousePos.x, mousePos.y);
            gl.uniform1i(bound.umousebutton, mousePos.button);
        }

        bound.textureLocs.forEach((loc, i) => {
            gl.uniform1i(loc, frameBuffers[i].i);
        });

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
};

const bl = [-1.0, -1.0, 0.0];
const br = [1.0, -1.0, 0.0];
const tr = [1.0, 1.0, 0.0];
const tl = [-1.0, 1.0, 0.0];

var positions = new Float32Array(bl.concat(br, tr, bl, tr, tl));
