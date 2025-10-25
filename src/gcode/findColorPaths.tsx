import {Path, StyleLine} from '../types';

export function findColorPaths(insetPaths: Path[]): {
    [key: string]: Array<{path: Path; style: StyleLine}>;
} {
    const colors: {
        [key: string]: Array<{path: Path; style: StyleLine}>;
    } = {};
    insetPaths.forEach((path) => {
        path.style.lines.forEach((line) => {
            if (!line || line.width == null || line.color == null) {
                return;
            }
            const key = line.color + ':' + line.width.toFixed(3);
            colors[key] = (colors[key] || []).concat([
                {
                    path,
                    style: line!,
                },
            ]);
        });
        path.style.fills.forEach((fill) => {
            if (fill && fill.color != null) {
                const key = fill.color + ':' + fill.lighten + ':pocket';
                colors[key] = (colors[key] || []).concat([
                    {
                        path,
                        style: fill!,
                    },
                ]);
            }
        });
    });
    return colors;
}
