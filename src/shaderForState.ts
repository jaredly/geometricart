import { sortedVisiblePaths } from './Canvas';
import { pathToPoints } from './CanvasRender';
import { hslToRgb, rgbToHsl } from './colorConvert';
import { Rgb } from './PalettesForm';
import { combinedPathStyles, insetPath, paletteColor } from './RenderPath';
import { Coord, Fill, Path, State } from './types';

const namedColors: { [key: string]: Rgb } = {
    white: { r: 1, g: 1, b: 1 },
    black: { r: 0, g: 0, b: 0 },
};
export const parseColor = (color?: string): null | Rgb => {
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
    return { r: r / 255, g: g / 255, b: b / 255 };
};

export const lightDark = ({ r, g, b }: Rgb, lighten?: number): Rgb => {
    if (!lighten) {
        return { r, g, b };
    }
    let [h, s, l] = rgbToHsl(r * 255, g * 255, b * 255);
    l += lighten * 0.1;

    [r, g, b] = hslToRgb(h, s, Math.max(0, Math.min(l, 1.0)));
    return { r: r / 255, g: g / 255, b: b / 255 };
};

export const shaderForState = (state: State): [number, string] => {
    // ok, so this is gonna be a mega-function

    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const paths = sortedVisiblePaths(state.paths, state.pathGroups, clip);
    const palette = state.palettes[state.activePalette];

    const coff = add(scale(state.view.center, state.view.zoom), {
        x: 500,
        y: 500,
    });

    const worldPos = (pos: Coord) =>
        add(mul(pos, { x: state.view.zoom, y: -state.view.zoom }), coff);

    let backgroundColor = { r: 0, g: 0, b: 0 };
    if (state.view.background) {
        const color = parseColor(paletteColor(palette, state.view.background));
        if (color) {
            backgroundColor = color;
        }
    }

    return [
        paths.length,
        `#version 300 es

precision mediump float;

out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;

float cro( vec2 a, vec2 b ) { return a.x*b.y - a.y*b.x; }


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

	${paths
        .filter((path) => {
            const style = combinedPathStyles(path, state.pathGroups);

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
            const style = combinedPathStyles(path, state.pathGroups);

            if (!style.fills.length) {
                return '';
            }
            let res: Array<string> = [];
            for (let i = style.fills.length - 1; i >= 0; i--) {
                const fill = style.fills[i];
                if (!fill) {
                    continue;
                }

                let myPath = path;
                if (fill.inset) {
                    const inset = insetPath(path, fill.inset / 100);
                    if (!inset) {
                        return;
                    }
                    myPath = inset;
                }

                const points = pathToPoints(myPath.segments);
                const last = points[points.length - 1];

                const color = parseColor(paletteColor(palette, fill.color));
                if (!color) {
                    return '';
                }

                res.push(
                    pathToSdf(myPath, worldPos, points, last, color, fill),
                );
            }
            return res.join('\n    ');
        })
        .join('\n    ')}

	return ${vec3(backgroundColor)};
}

void main() {
	// vec2 p = gl_FragCoord.xy / u_resolution.xy;
	// vec2 p = (-u_resolution.xy + 2.0*gl_FragCoord.xy)/u_resolution.y;
	vec2 p = gl_FragCoord.xy;

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

export const vec2 = (v: Coord) => `vec2(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`;
export const vec3 = (v: Rgb) =>
    `vec3(${v.r.toFixed(2)}, ${v.g.toFixed(2)}, ${v.b.toFixed(2)})`;
export const sub = (a: Coord, b: Coord) => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Coord, b: Coord) => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Coord, b: Coord) => ({ x: a.x * b.x, y: a.y * b.y });
export const scale = (a: Coord, by: number) => ({ x: a.x * by, y: a.y * by });
export const cross = (a: Coord, b: Coord) => a.x * b.y - a.y * b.x;
function pathToSdf(
    path: Path,
    worldPos: (pos: Coord) => { x: number; y: number },
    points: Coord[],
    last: Coord,
    color: Rgb,
    fill: Fill,
): string {
    return `{ // path ${path.id}
	float gs = ${cross(
        sub(worldPos(points[0]), worldPos(last)),
        sub(worldPos(points[1]), worldPos(points[0])),
    ).toFixed(3)};
    vec4 res;

	${points
        .map((point, i) => {
            const next = worldPos(
                i === points.length - 1 ? points[0] : points[i + 1],
            );
            const pos = vec2(worldPos(point));
            return `{ // point ${i}
    // vec2  e = ${vec2(next)}-${pos}, w = p-${pos};
    vec2  e = ${vec2(sub(next, worldPos(point)))}, w = p-${pos};
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
    
    float d = sqrt(res.x)*sign(res.w);
	if (d < 0.0) {
				return ${vec3(lightDark(color, fill.lighten))};

	}


				}`;
}
