import {epsilon} from '../../../rendering/epsilonToZero';
import {GeometryInner, pathToGeometryInner} from '../../../threed/pathToGeometryMid';
import {splitEvenOddIntoDisconnectedShapes} from '../../../threed/splitEvenOddIntoDisconnectedShapes';
import {BarePath, TilingShape} from '../../../types';
import {pk} from '../../pk';
import {Config} from '../animator';
import {State} from './animator.utils';
import {calcMargin} from './calcMargin';
import {combinedPath} from './renderFrame';

export type MessageToWorker = {
    state: State;
    shape: TilingShape;
    config: Config;
    step: number;
};

export type MessageResponse = {
    svg: string;
    geom: GeometryInner[];
    zoom: number;
    bounds: (BarePath & {hole?: boolean})[];
}[];

type MessageUpdate = {type: 'update'; amount: number};

export type MessageFromWorker = MessageResponse | MessageUpdate;

self.onmessage = (evt: MessageEvent<MessageToWorker>) => {
    const {state, config, shape, step} = evt.data;
    const res: MessageResponse = [];
    const max = state.layers.length - 1 + epsilon;
    postMessage({type: 'update', amount: 0});
    for (let i = 0; i < max; i += step) {
        const peggedZoom = (config.peg ? calcMargin(i, state.lines[0]) : 1) * config.zoom;

        const {onePath: path, bounds} = combinedPath(i, config, state, shape);
        path.setFillType(pk.FillType.EvenOdd);
        const svg = path.toSVGString();
        const geom = splitEvenOddIntoDisconnectedShapes(path).map((sub) =>
            pathToGeometryInner(sub),
        );
        if (geom.some((g) => !g)) {
            console.warn(`failed to calculate geometry`);
            continue;
        }
        res.push({svg, geom: geom as GeometryInner[], zoom: peggedZoom, bounds});
        path.delete();
        postMessage({type: 'update', amount: i / max});
    }
    postMessage(res);
};
