// Type definitions for svg-path-intersections (standalone build)
// Project: https://github.com/your-repo/svg-path-intersections
// Definitions by: GitHub Copilot
declare module 'svg-path-intersections' {
    declare namespace pathIntersections {
        type Quality = 'low' | 'medium' | 'high';

        interface Point {
            x: number;
            y: number;
        }

        interface Intersection extends Point {
            // parametric positions on each segment (if available)
            t1?: number;
            t2?: number;
            // segment indices (if available)
            segment1?: number;
            segment2?: number;
            // control point arrays for involved segments (if available)
            cpts1?: Array<any>;
            cpts2?: Array<any>;
        }

        export type PathCommand =
            | {type: 'Z'; values: []}
            | {type: 'M' | 'L' | 'T'; values: [number, number]}
            | {type: 'H' | 'V'; values: [number]}
            | {type: 'Q' | 'S'; values: [number, number, number, number]}
            | {type: 'C'; values: [number, number, number, number, number, number]}
            | {type: 'A'; values: [number, number, number, number, number, number, number]};

        /**
         * M x y
         * L x y
         * T x y
         * C cx cy c2x c2y x y
         * H x
         * V y
         * A rx ry cx cy flag x y
         * Q a b x y
         * S a b x y
         * Z
         */
        // interface PathCommand {
        //     type: string;
        //     values: number[];
        // }
        type PathData = PathCommand[];

        interface CircleLike {
            cx: number;
            cy: number;
            r: number;
            rx?: number;
            ry?: number;
        }

        interface BBox {
            x: number;
            y: number;
            width: number;
            height: number;
            right: number;
            bottom: number;
        }

        interface svgElInstance {
            // common SVG-ish properties used by the library
            type?: string;
            cx?: number;
            cy?: number;
            r?: number;
            rx?: number;
            ry?: number;
            x?: number;
            y?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
            width?: number;
            height?: number;
            points?: number[] | string;
            d?: string | PathData;

            // produce normalized path data
            toPathData(keepArcs?: boolean): PathData;
            // other properties are present at runtime but are not strictly typed here
        }

        interface PathIntersectionsAPI {
            findPathIntersections(
                d1: string | svgElInstance | PathData | object,
                d2: string | svgElInstance | PathData | object,
                stopAtFirst?: boolean,
                quality?: Quality | string,
            ): Intersection[] | Point[];

            findPathDataIntersections(
                pathData1: PathData,
                pathData2: PathData,
                stopAtFirst?: boolean,
                quality?: Quality | string,
            ): Intersection[];

            getElementIntersections(
                el1: Element,
                el2: Element,
                stopAtFirst?: boolean,
                quality?: Quality | string,
            ): Intersection[];

            checkCollision(
                d1: string | svgElInstance | PathData | object,
                d2: string | svgElInstance | PathData | object,
            ): number;

            findCircleIntersection(c1: CircleLike, c2: CircleLike, decimals?: number): Point[];

            pointAtT(pts: Array<{x: number; y: number}>, t?: number): Point;

            parsePathDataNormalized(
                d: string,
                options?: {
                    toAbsolute?: boolean;
                    arcsToCubic?: boolean;
                    arcAccuracy?: number;
                    toLonghands?: boolean;
                    arcToCubic?: boolean;
                },
            ): PathData;

            svgEl(props?: Record<string, any>): svgElInstance;

            // utilities
            commandBBox(points: Array<{x: number; y: number}>): BBox;
        }
    }

    /**
     * The module exports a CommonJS object. Use:
     *
     *   import pathIntersections = require('svg-path-intersections');
     *
     * or with allowSyntheticDefaultImports / esModuleInterop:
     *
     *   import pathIntersections from 'svg-path-intersections';
     */
    declare const pathIntersections: pathIntersections.PathIntersectionsAPI;
    export = pathIntersections;
}
