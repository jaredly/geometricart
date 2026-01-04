import {BarePath} from '../../../types';
import {parseColor} from './colors';
import {PendingState, PendingStateUpdate} from './editState';
import {RenderItem} from './evaluate';
import {colorToRgb} from './export-types';
import {Hover} from './resolveMods';

export function renderShape(
    key: string,
    shape: BarePath,
    hover: Hover | null,
    selectedShapes: string[],
    pending?: PendingState['pending'],
    update?: PendingStateUpdate,
): RenderItem[] {
    const isSelected = selectedShapes.includes(key);
    const isHovered =
        (hover?.type === 'shape' && hover.id === key) ||
        (hover?.type === 'shapes' && hover.ids.includes(key));
    return [
        {
            type: 'path',
            shadow: {
                offset: {x: 0, y: 0},
                blur: {x: 0.06, y: 0.06},
                color: {r: 0, g: 0, b: 0},
            },
            shapes: [shape],
            strokeWidth: isSelected ? 0.06 : 0.03,
            zIndex: isHovered || isSelected ? 150 : 100,
            color: {r: 0, g: 0, b: 0},
            key: key + '-shadow',
        },
        {
            type: 'path',
            color: isHovered
                ? colorToRgb(parseColor('gold')!)
                : isSelected
                  ? colorToRgb(parseColor('magenta')!)
                  : {r: 255, g: 255, b: 255},
            key,
            onClick() {
                if (!update || !pending) return;
                if (pending?.type === 'select-shape') {
                    update.pending.replace(null);
                    pending.onDone(key);
                    return;
                }
                if (pending?.type !== 'select-shapes') return;
                if (!selectedShapes.includes(key)) {
                    update.pending.variant('select-shapes').shapes.push(key);
                } else {
                    const idx = selectedShapes.indexOf(key);
                    update.pending.variant('select-shapes').shapes[idx].remove();
                }
            },
            shapes: [shape],
            strokeWidth: isSelected ? 0.06 : 0.03,
            zIndex: isHovered || isSelected ? 150 : 100,
        },
    ];
}
