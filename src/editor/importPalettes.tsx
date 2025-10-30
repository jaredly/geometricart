import {Action} from '../state/Action';

export function importPalettes(
    palettes: {[key: string]: string[]},
    data: {[key: string]: string[]},
    dispatch: (action: Action) => void,
) {
    const have = Object.keys(palettes).map((k) => palettes[k].join(';;'));
    Object.keys(data).forEach((name) => {
        if (have.includes(data[name].join(';;'))) {
            // already have it
            return;
        }
        if (palettes[name]) {
            let num = 1;
            while (palettes[`${name}${num}`]) {
                num += 1;
            }
            name = name + num;
        }
        dispatch({
            type: 'library:palette:update',
            name,
            colors: data[name],
        });
    });
}