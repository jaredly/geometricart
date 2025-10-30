import {sortedVisibleInsetPaths} from './sortedVisibleInsetPaths';
import {pathToPoints, rasterSegPoints} from './pathToPoints';
import {hslToRgb, rgbToHsl} from './colorConvert';
import {pathToPrimitives} from '../editor/findSelection';
import {Primitive} from './intersect';
import {Rgb} from '../editor/Rgb';
import {paletteColor} from '../editor/RenderPath';
import {shaderFunctions} from './shaderFunctions';
import {Coord, Fill, Path, State, StyleLine} from '../types';
import {getClips} from './pkInsetPaths';

const namedColors: {[key: string]: Rgb} = {
    white: {r: 1, g: 1, b: 1},
    black: {r: 0, g: 0, b: 0},
};
const parseColor = (color?: string): null | Rgb => {
    if (color == null) {
        return null;
    }
    if (namedColors[color]) {
        return namedColors[color];
    }
    if (!color.startsWith('#')) {
        return null;
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5), 16);
    return {r: r / 255, g: g / 255, b: b / 255};
};

const lightDark = ({r, g, b}: Rgb, lighten?: number): Rgb => {
    if (!lighten) {
        return {r, g, b};
    }
    let [h, s, l] = rgbToHsl(r * 255, g * 255, b * 255);
    l += lighten * 0.1;

    [r, g, b] = hslToRgb(h, s, Math.max(0, Math.min(l, 1.0)));
    return {r: r / 255, g: g / 255, b: b / 255};
};

const shaderForState = (state: State): [number, string] => {
    // ok, so this is gonna be a mega-function

    const paths = sortedVisibleInsetPaths(
        state.paths,
        state.pathGroups,
        {next: (_, __) => 0},
        getClips(state),
        state.view.hideDuplicatePaths,
    );
    const palette = state.palette;

    let backgroundColor = {r: 0, g: 0, b: 0};
    if (state.view.background) {
        const color = parseColor(paletteColor(palette, state.view.background));
        if (color) {
            backgroundColor = color;
        }
    }

    const maxPathLength = paths.reduce((m, p) => Math.max(m, p.segments.length), 0);

    const coff = add(scale(state.view.center, state.view.zoom), {
        x: 500,
        y: 500,
    });

    return [
        paths.length,
        `#version 300 es

precision mediump float;

out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;

float cro( vec2 a, vec2 b ) { return a.x*b.y - a.y*b.x; }

${shaderFunctions(maxPathLength)}

vec3 sdgTriangle( in vec2 p, in vec2 v[3] )
{
    float gs = cro(v[0]-v[2],v[1]-v[0]);
    vec4 res;

    {
    vec2  e = v[1]-v[0], w = p-v[0];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q), s = gs*cro(w,e);
    res = vec4(d,q,s);
    } {
    vec2  e = v[2]-v[1], w = p-v[1];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q), s = gs*cro(w,e);
    res = vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
    } {
    vec2  e = v[0]-v[2], w = p-v[2];
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q), s = gs*cro(w,e);
    res = vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
    }

    float d = sqrt(res.x)*sign(res.w);
    return vec3(d,res.yz/d);
}

vec3 signedDistance(vec2 p) {
	// ok, so this quad requires it to be convex I believe.
	// but I can probably slice my polygons into convex polygons...

	${makePathFunctions(paths, state, palette, maxPathLength)}

	return ${vec3(backgroundColor)};
}

void main() {
	// vec2 p = gl_FragCoord.xy / u_resolution.xy;
	// vec2 p = (-u_resolution.xy + 2.0*gl_FragCoord.xy)/u_resolution.y;
	vec2 p = gl_FragCoord.xy;
	p.y = u_resolution.y - p.y;
	p = p - ${vec2(coff)};

	fragColor = vec4(signedDistance(p), 1.0);
	// if (p.x > 100.0) {
	// 	fragColor = vec4(1.0);
	// } else {
	// 	fragColor = vec4(0.5);
	// }
}

	`,
    ];
};

const vec2 = (v: Coord) => `vec2(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`;
const vec3 = (v: Rgb) => `vec3(${v.r.toFixed(2)}, ${v.g.toFixed(2)}, ${v.b.toFixed(2)})`;
const sub = (a: Coord, b: Coord) => ({x: a.x - b.x, y: a.y - b.y});
const add = (a: Coord, b: Coord) => ({x: a.x + b.x, y: a.y + b.y});
const mul = (a: Coord, b: Coord) => ({x: a.x * b.x, y: a.y * b.y});
const scale = (a: Coord, by: number) => ({x: a.x * by, y: a.y * by});
const cross = (a: Coord, b: Coord) => a.x * b.y - a.y * b.x;

function makePathFunctions(paths: Path[], state: State, palette: string[], maxSegs: number) {
    // const worldPos = (pos: Coord) =>
    //     add(mul(pos, { x: state.view.zoom, y: -state.view.zoom }), coff);

    return (
        paths
            .filter((path) => {
                const style = path.style;

                if (!style.fills.length || !style.fills[0]) {
                    console.log('no fill', path.id);
                    return false;
                }
                const fill = style.fills[0];
                const pcolor = paletteColor(palette, fill.color);
                const color = parseColor(pcolor);
                if (color == null) {
                    console.log('no color', path.id, fill.color, pcolor, color);
                    return false;
                }
                return true;
            })
            // .slice(0, 1)
            .map((path, i) => {
                const style = path.style;

                if (!style.fills.length) {
                    return '';
                }
                const stroke = style.lines[0];
                let res: Array<string> = [];
                for (let i = style.fills.length - 1; i >= 0; i--) {
                    const fill = style.fills[i];
                    if (!fill) {
                        continue;
                    }

                    let myPath = path;
                    if (fill.inset) {
                        // STOPSHIP
                        // const inset = insetPath(path, fill.inset / 100);
                        // if (!inset) {
                        //     return;
                        // }
                        // myPath = inset;
                    }

                    const color = parseColor(paletteColor(palette, fill.color));
                    if (!color) {
                        return '';
                    }

                    res.push(
                        pathToSdf(
                            myPath,
                            // worldPos,
                            state.view.zoom,
                            color,
                            fill,
                            stroke ? (stroke.width ?? 0) : 0,
                            stroke ? parseColor(paletteColor(palette, stroke.color)) : null,
                        ),
                    );
                }
                return res.join('\n    ');
            })
            .join('\n    ')
    );
}

const transformPrim = (prim: Primitive, zoom: number): Primitive => {
    const wx = (x: number) => x * zoom;
    const wy = (y: number) => y * zoom;
    if (prim.type === 'line') {
        const b = prim.m === Infinity ? wx(prim.b) : wy(prim.b);
        if (!prim.limit) {
            return {...prim, b};
        }
        return {
            ...prim,
            b,
            limit:
                prim.m === Infinity
                    ? [wy(prim.limit[0]), wy(prim.limit[1])]
                    : [wx(prim.limit[0]), wx(prim.limit[1])],
        };
    } else {
        return {
            ...prim,
            center: scale(prim.center, zoom),
            radius: Math.abs(wx(prim.radius) - wx(0)),
        };
    }
};

const primToGlsl = (prim: Primitive) =>
    `Segment(${prim.type === 'circle' ? 'true' : 'false'}, ${vec2({
        x: prim.limit![0],
        y: prim.limit![1],
    })}, ${vec2(
        prim.type === 'line' ? {x: prim.m, y: prim.b} : prim.center,
    )}, ${prim.type === 'circle' ? prim.radius.toFixed(2) : '0.0'})`;

// export const alignPrimitives = (prims: Array<Primitive>) => {
// 	prims.forEach((prim, i) => {
// 		const prev = i === 0 ? prims[prims.length - 1] : prims[i - 1]
// 		if (prev.type === 'line' && prim.type === 'line') {
// 			if (prev.m === Infinity) {
// 				if (prim.m > 0) {
// 					prim.limit[0] = prev.limit[0]
// 				} else {
// 					prim.limit[1] = prev.limit[0]
// 				}
// 			} else {
// 				if (prim.m > 0 && prev.limit > 0)
// 			}
// 		}
// 	})
// }

function pathToExpensive(
    path: Path,
    // worldPos: (pos: Coord) => Coord,
    zoom: number,
    color: Rgb,
    fill: Fill,
    maxSegs: number,
): string {
    const prims = pathToPrimitives(path.segments.map((seg) => ({...seg, to: scale(seg.to, zoom)})));
    // alignPrimitives(prims)

    return `{ // path ${path.id}
		Segment[${maxSegs}] segments;
		${prims
            .map((prim, i) => {
                return `segments[${i}] = ${primToGlsl(prim)};`;
            })
            .join('\n    ')}
		bool hits = isInsidePath(p, segments, ${prims.length}, false);
		// bool hits2 = isInsidePath(p, segments, ${prims.length}, true);
		if (hits ) {
			return ${vec3(lightDark(color, fill.lighten))};
		}
	}`;
}

function strokeToSdf(
    path: Path,
    // worldPos: (pos: Coord) => { x: number; y: number },
    zoom: number,
    color: Rgb,
    stroke: StyleLine,
): string {
    const points = rasterSegPoints(pathToPoints(path.segments, path.open ? path.origin : null));
    const last = points[points.length - 1];

    return `{ // path ${path.id}
	float gs = ${cross(
        sub(scale(points[0], zoom), scale(last, zoom)),
        sub(scale(points[1], zoom), scale(points[0], zoom)),
    ).toFixed(3)};
    vec4 res;

	${points
        .map((point, i) => {
            const next = scale(i === points.length - 1 ? points[0] : points[i + 1], zoom);
            const pos = vec2(scale(point, zoom));
            return `{ // point ${i}
    // vec2  e = ${vec2(next)}-${pos}, w = p-${pos};
    vec2  e = ${vec2(sub(next, scale(point, zoom)))}, w = p-${pos};
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q), s = gs*cro(w,e);
    res = ${
        i === 0
            ? 'vec4(d,q,s)'
            : `
    vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
	`
    };
		}`;
        })
        .join('\n    ')}

    // float d = sqrt(res.x)*sign(res.w);
	if (abs(res.x) < ${(stroke.width ?? 2.0).toFixed(1)}) {
				return ${vec3(color)};

	}


				}`;
}

function pathToSdf(
    path: Path,
    // worldPos: (pos: Coord) => { x: number; y: number },
    zoom: number,
    color: Rgb,
    fill: Fill,
    strokeWidth?: number,
    stroke?: Rgb | null,
): string {
    const points = rasterSegPoints(pathToPoints(path.segments, path.open ? path.origin : null));
    const last = points[points.length - 1];

    return `{ // path ${path.id}
	float gs = ${cross(
        sub(scale(points[0], zoom), scale(last, zoom)),
        sub(scale(points[1], zoom), scale(points[0], zoom)),
    ).toFixed(3)};
    vec4 res;

	${points
        .map((point, i) => {
            const next = scale(i === points.length - 1 ? points[0] : points[i + 1], zoom);
            const pos = vec2(scale(point, zoom));
            return `{ // point ${i}
    // vec2  e = ${vec2(next)}-${pos}, w = p-${pos};
    vec2  e = ${vec2(sub(next, scale(point, zoom)))}, w = p-${pos};
    vec2  q = w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);
    float d = dot(q,q), s = gs*cro(w,e);
    res = ${
        i === 0
            ? 'vec4(d,q,s)'
            : `
    vec4( (d<res.x) ? vec3(d,q) : res.xyz,
                (s>res.w) ?      s    : res.w );
	`
    };
		}`;
        })
        .join('\n    ')}

    // float d = sqrt(res.x)*sign(res.w);
	${
        strokeWidth && stroke
            ? `if (abs(res.x) < ${strokeWidth.toFixed(1)}) {
		return ${vec3(stroke)};
	}`
            : ''
    }
	if (res.w < 0.0) {
				return ${vec3(lightDark(color, fill.lighten))};

	}


				}`;
}
