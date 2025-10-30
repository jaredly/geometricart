import {LerpPoint} from '../types';
import {mulPos} from './mulPos';

export function pointsPathD(height: number, points: LerpPoint[], width: number) {
    const scale = {x: width, y: height};
    const scaled: Array<LerpPoint> = points.map((p) => ({
        pos: mulPos(p.pos, scale),
        leftCtrl: p.leftCtrl ? mulPos(p.leftCtrl, scale) : undefined,
        rightCtrl: p.rightCtrl ? mulPos(p.rightCtrl, scale) : undefined,
    }));
    if (!scaled.length || scaled[0].pos.x > 0) {
        scaled.unshift({pos: {x: 0, y: 0}});
    }
    if (!points.length || points[points.length - 1].pos.x < 1) {
        scaled.push({pos: {x: width, y: height}});
    }
    return pointsPath(scaled).join(' ');
}

export function pointsPath(current: LerpPoint[]) {
    return current.map((p, i) => {
        if (i === 0) {
            return `M ${p.pos.x},${p.pos.y}`;
        }
        const prev = current[i - 1];
        if (prev.rightCtrl || p.leftCtrl) {
            const one = prev.rightCtrl
                ? {
                      x: prev.pos.x + prev.rightCtrl.x,
                      y: prev.pos.y + prev.rightCtrl.y,
                  }
                : prev.pos;
            const two = p.leftCtrl
                ? {
                      x: p.pos.x + p.leftCtrl.x,
                      y: p.pos.y + p.leftCtrl.y,
                  }
                : p.pos;
            return `C ${one.x},${one.y} ${two.x},${two.y} ${p.pos.x},${p.pos.y}`;
        }
        return `L ${p.pos.x},${p.pos.y}`;
    });
}