import {coordKey} from '../rendering/coordKey';
import {closeEnough} from '../rendering/epsilonToZero';
import {Coord} from '../types';
import {addToMap} from './shapesFromSegments';

export const colorGraph = (edges: [number, number][]) => {
    const edgeMap: Record<number, number[]> = {};
    let max = 0;
    edges.forEach(([a, b]) => {
        addToMap(edgeMap, a, b);
        addToMap(edgeMap, b, a);
        max = Math.max(max, a, b);
    });
    const colors: (null | number)[] = Array(max + 1).fill(null);

    const single = (idx: number) => {
        if (!edgeMap[idx]) {
            console.warn(`no edges for ${idx}`);
            colors[idx] = -1;
            return;
        }
        const used = edgeMap[idx].map((idx) => colors[idx]);
        for (let i = 0; i < 10; i++) {
            if (!used.includes(i)) {
                colors[idx] = i;
                return;
            }
        }
        colors[idx] = -1;
    };
    for (let i = 0; i <= max; i++) {
        single(i);
    }
    return colors as number[];
};

const toEdges = <T>(shape: T[]): [T, T][] =>
    shape.map((coord, i) => [shape[i === 0 ? shape.length - 1 : i - 1], coord]);

const sortEdge = (edge: [Coord, Coord]) =>
    (closeEnough(edge[0].x, edge[1].x) ? edge[0].y < edge[1].y : edge[0].x < edge[1].x)
        ? edge
        : [edge[1], edge[1]];

export const colorShapePoints = (shapes: number[][]) => {
    const byEdge: Record<string, number[]> = {};
    shapes.forEach((shape, i) => {
        const edges = toEdges(shape).map(([a, b]) => (a < b ? `${a}:${b}` : `${a}:${b}`));
        edges.forEach((edge) => {
            addToMap(byEdge, edge, i);
        });
    });

    return colorGraph(Object.values(byEdge).filter((e) => e.length === 2) as [number, number][]);
};

export const colorShapes = (shapes: Coord[][], minLength: number) => {
    const by = Math.log10(100 / minLength);
    // const by = Math.log10(100 / minLength);
    const byEdge: Record<string, number[]> = {};
    shapes.forEach((shape, i) => {
        const edges = toEdges(shape);
        edges.forEach((edge) => {
            const k = coordKey(
                {
                    x: (edge[0].x + edge[1].x) / 2,
                    y: (edge[0].y + edge[1].y) / 2,
                },
                by,
            );
            // const [a, b] = sortEdge(edge);
            // const k = `${coordKey(a, by)}:${coordKey(b, by)}`;
            addToMap(byEdge, k, i);
        });
    });
    return colorGraph(Object.values(byEdge).filter((e) => e.length === 2) as [number, number][]);
};

// V = 4
// graph = [[0, 1, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 1, 0]]
// def isValid(v, color, c):  # check whether putting a color valid for v
//     for i in range(V):
//         if graph[v][i] and c == color[i]:
//             return False
//     return True
// def mColoring(colors, color, vertex):
//     if vertex == V:  # when all vertices are considered
//         return True
//     for col in range(1, colors + 1):
//         if isValid(vertex, color,
//                    col):  # check whether color col is valid or not
//             color[vertex] = col
//             if mColoring(colors, color, vertex + 1):
//                 return True  # go for additional vertices
//             color[vertex] = 0
//     return False  # when no colors can be assigned
// colors = 3  # Number of colors
// color = [0] * V  # make color matrix for each vertex
// if not mColoring(
//         colors, color,
//         0):  # initially set to 0 and for Vertex 0 check graph coloring
//     print("Solution does not exist.")
// else:
//     print("Assigned Colors are:")
//     for i in range(V):
//         print(color[i], end=" ")
