import {Box} from './export-types';
import {State} from './types/state-type';

export const makeBox = (config: State['view'], width: number, height: number): Box => {
    return {
        x: config.center.x - width / 2 / config.ppu,
        y: config.center.y - height / 2 / config.ppu,
        width: width / config.ppu,
        height: height / config.ppu,
    };
};
