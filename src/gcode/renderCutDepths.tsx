import {angleTo, push} from '../rendering/getMirrorTransforms';
import {GCodeData, Tool} from './Visualize.Tool.related';

export function renderCutDepths(
    ctx: CanvasRenderingContext2D,
    data: GCodeData,
    forDepthMap = false,
) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'darken';
    // ctx.globalCompositeOperation = forDepthMap ? 'darken' : 'source-over';
    let z = null as null | number;
    const depth = 0 - data.bounds.min.z!;

    const vBit = false;
    let tool: Tool = {diameter: 3};

    data.toolPaths.forEach(({tool, positions}) => {
        ctx.lineWidth = tool.diameter;
        if (!tool.vbit) {
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            positions.forEach((pos, i) => {
                if (pos.z != z) {
                    if (z != null) {
                        ctx.stroke();
                    }
                    z = pos.z;
                    const zDepth = (Math.min(0, z) - data.bounds.min.z!) / depth;
                    ctx.strokeStyle = forDepthMap
                        ? `rgb(${Math.round(zDepth * 255)}, 0, 0)`
                        : `hsl(0, 100%, ${Math.round(zDepth * 100)}%)`;
                    if (!forDepthMap && zDepth > 0.999) {
                        ctx.strokeStyle = 'rgba(0,0,0,0)';
                    }
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            });
            ctx.stroke();
            return;
        }

        const vbit = tool.vbit;

        positions.forEach((pos, i) => {
            if (i == 0) {
                return;
            }

            const zDepth = (Math.min(0, pos.z) - data.bounds.min.z!) / depth;

            // const color = zColor(forDepthMap, zDepth);
            const last = positions[i - 1];

            // STOPSHIP: calculate ... the "top z" based on angle, not just set to zero.
            // OH I guess that means we need the "top z" to be higher than the top of the block ...
            const angle = angleTo(last, pos);

            const p1 = push(last, angle + Math.PI / 2, tool.diameter / 2);
            const p2 = push(last, angle - Math.PI / 2, tool.diameter / 2);

            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            // const gradient = ctx.createLinearGradient(last.x, last.y, pos.x, pos.y);
            const bottom = zColor(forDepthMap, zDepth);

            // Hmmmmmm I think top should be the "start" of the path instead?
            const top = zColor(forDepthMap, 1);

            // Add three color stops
            gradient.addColorStop(0, top);
            gradient.addColorStop(0.5, bottom);
            gradient.addColorStop(1, top);

            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();

            const g2 = circleGradient(ctx, last, tool.diameter / 2);
            g2.addColorStop(0, bottom);
            g2.addColorStop(1, top);
            ctx.fillStyle = g2;

            ctx.beginPath();
            ctx.arc(last.x, last.y, tool.diameter / 2, 0, 2 * Math.PI);
            ctx.fill();

            // ctx.lineTo(pos.x, pos.y);
        });
    });
}

function circleGradient(
    ctx: CanvasRenderingContext2D,
    last: {x: number; y: number},
    radius: number,
) {
    return ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, radius);
}
function zColor(forDepthMap: boolean, zDepth: number) {
    return forDepthMap
        ? `rgb(${Math.round(zDepth * 255)}, 0, 0)`
        : `hsl(0, 100%, ${Math.round(zDepth * 100)}%)`;
}
