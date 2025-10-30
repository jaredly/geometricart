import {Coord} from '../types';
import {PSeg} from './getBuiltins';
import {coordsEqual, reverseSegment} from '../rendering/pathsAreIdentical';
import {arcPath} from '../editor/RenderPendingPath';
import {mergeBounds, segmentBounds} from '../editor/Bounds';
import {Bounds} from '../editor/Bounds';

const segmentPath = ({prev, segment}: PSeg) => {
    if (segment.type === 'Line') {
        return `M${prev.x} ${prev.y}L${segment.to.x} ${segment.to.y}`;
    }
    if (segment.type === 'Quad') {
        return `M${prev.x} ${prev.y}Q${segment.control.x} ${segment.control.y} ${segment.to.x} ${segment.to.y}`;
    }
    if (coordsEqual(prev, segment.to)) {
        const mid = {
            x: segment.center.x + (segment.center.x - prev.x),
            y: segment.center.y + (segment.center.y - prev.y),
        };
        return arcPath({...segment, to: mid}, prev, 1, true) + arcPath(segment, prev, 1);
    }
    return arcPath(segment, prev, 1, true);
};

const renderSegment = (pseg: PSeg, point?: Coord) => {
    const bounds = segmentBounds(
        pseg.segment.type === 'Arc' ? pseg.segment.to : pseg.prev,
        pseg.segment,
    );
    const w = bounds.x1 - bounds.x0;
    const h = bounds.y1 - bounds.y0;
    let x = w < h ? (h - w) / 2 : 0;
    let y = h < w ? (w - h) / 2 : 0;
    let size = Math.max(w, h);
    x += size * 0.25;
    y += size * 0.25;
    size += size * 0.5;
    const path = segmentPath(pseg);
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="${
        bounds.x0 - x
    } ${bounds.y0 - y} ${size} ${size}">
    <path d="${path}" fill="none" stroke="red" stroke-width="${size / 10}" />
    <circle cx="${pseg.prev.x}" cy="${pseg.prev.y}" r="${size / 10}" fill="white" />
    ${point ? `<circle cx="${point.x}" cy="${point.y}" r="${size / 10}" fill="blue" />` : ''}
    </svg>
    `;
};

const psegmentsBounds = (segments: Array<PSeg>): Bounds => {
    let bounds = segmentBounds(segments[0].prev, segments[0].segment);
    for (let i = 1; i < segments.length; i++) {
        const next = segmentBounds(segments[i].prev, segments[i].segment);
        bounds = mergeBounds(bounds, next);
    }
    return bounds;
};

const renderSegments = (pseg: PSeg[], points?: Coord[], colors?: string[]) => {
    const bounds = psegmentsBounds(pseg);
    const w = bounds.x1 - bounds.x0;
    const h = bounds.y1 - bounds.y0;
    let x = w < h ? (h - w) / 2 : 0;
    let y = h < w ? (w - h) / 2 : 0;
    let size = Math.max(w, h);
    x += size * 0.25;
    y += size * 0.25;
    size += size * 0.5;
    // const path = segmentPath(pseg);
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="${
        bounds.x0 - x
    } ${bounds.y0 - y} ${size} ${size}">
    ${pseg
        .map(
            (pseg, i) => `
    <path d="${segmentPath(pseg)}" fill="none" stroke="${
        colors ? colors[i % colors.length] : 'red'
    }" stroke-width="${size / 50}" />
            `,
        )
        .join('\n')}
    </svg>
    `;
};

const consoleSegment = (seg: PSeg, point?: Coord) => {
    const bgi = `data:image/svg+xml;base64,${btoa(renderSegment(seg, point))}`;
    const img = new Image();
    img.src = bgi;
    document.body.append(img);
    console.log('%c ', `background-image: url("${bgi}");background-size:cover;padding:20px`);
};

const consoleSvg = (svg: string) => {
    const bgi = `data:image/svg+xml;base64,${btoa(svg)}`;
    // const img = new Image();
    // img.src = bgi;
    // document.body.append(img);
    console.log('%c ', `background-image: url("${bgi}");background-size:cover;padding:20px`);
};
