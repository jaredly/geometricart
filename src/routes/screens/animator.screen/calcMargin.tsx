import {dist} from '../../../rendering/getMirrorTransforms';
import {State, lineAt} from './animator.utils';

export const calcMargin = (preview: number, line: State['lines'][0]) => {
    const lat = lineAt(line.keyframes, preview, line.fade);
    const log = lineAt(line.keyframes, 0, line.fade);
    if (!lat || !log) return 1;
    const d1 = dist(lat.points[0], lat.points[1]);
    const d2 = dist(log.points[0], log.points[1]);
    return d1 / d2;
};
