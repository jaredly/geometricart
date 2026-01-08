import {BarePath} from '../../../../types';
import {parseColor} from '../utils/colors';
import {PendingState, PendingStateUpdate} from '../utils/editState';
import {RenderItem} from '../eval/evaluate';
import {colorToRgb} from '../export-types';
import {Hover} from '../utils/resolveMods';

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
    const lineWidth = 0.1;
    return [
        {
            type: 'path',
            shadow: {
                offset: {x: 0, y: 0},
                blur: {x: 0.06, y: 0.06},
                color: {r: 0, g: 0, b: 0},
            },
            shapes: [shape],
            strokeWidth: lineWidth * (isSelected ? 2 : 1),
            zIndex: isHovered || isSelected ? 150 : 100,
            adjustForZoom: true,
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
            adjustForZoom: true,
            strokeWidth: lineWidth * (isSelected ? 2 : 1),
            zIndex: isHovered || isSelected ? 150 : 100,
        },
    ];
}
