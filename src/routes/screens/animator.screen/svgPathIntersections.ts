/**
 * SVG Path Intersection Library
 *
 * This library provides comprehensive functionality for finding intersections between SVG paths,
 * shapes, and geometric primitives. It handles various SVG path commands (M, L, C, Q, A, Z),
 * converts them to a normalized format, and uses mathematical algorithms to detect intersections.
 *
 * Key capabilities:
 * - Path vs Path intersections (including curved segments)
 * - Circle vs Circle intersections
 * - Line vs Line intersections
 * - Bezier curve intersections (cubic and quadratic)
 * - Support for various SVG shape types (circle, rect, polygon, polyline, ellipse)
 *
 * Based on algorithms from:
 * - snap.svg intersection function
 * - https://github.com/bpmn-io/path-intersection
 * - https://www.particleincell.com/2013/cubic-line-intersection/
 */

/**
 * Quality setting for intersection detection accuracy
 * - 'low': Fast but less accurate (larger sample distances)
 * - 'medium': Balanced accuracy and performance
 * - 'high': Maximum accuracy (smaller sample distances, more samples)
 */
type Quality = 'low' | 'medium' | 'high';

/**
 * Represents a 2D point in Cartesian coordinates
 */
interface Point {
    x: number;
    y: number;
}

/**
 * Represents an intersection point between two path segments
 * Extends Point to include intersection metadata
 */
interface Intersection extends Point {
    // Parametric positions on each segment (0-1 range)
    // t1: position along first segment, t2: position along second segment
    t1?: number;
    t2?: number;
    // Indices of the intersecting segments in their respective paths
    segment1?: number;
    segment2?: number;
    // Control points of the bezier curves involved in the intersection
    cpts1?: Array<any>;
    cpts2?: Array<any>;
}

/**
 * Represents a single SVG path command with its associated values
 * All commands are normalized to absolute coordinates (uppercase)
 *
 * Command types:
 * - M: MoveTo (x, y)
 * - L: LineTo (x, y)
 * - H: Horizontal LineTo (x)
 * - V: Vertical LineTo (y)
 * - C: Cubic Bezier (cp1x, cp1y, cp2x, cp2y, x, y)
 * - Q: Quadratic Bezier (cpx, cpy, x, y)
 * - S: Smooth Cubic Bezier (cp2x, cp2y, x, y)
 * - T: Smooth Quadratic Bezier (x, y)
 * - A: Arc (rx, ry, rotation, largeArcFlag, sweepFlag, x, y)
 * - Z: ClosePath
 */
export type PathCommand =
    | {type: 'Z'; values: []}
    | {type: 'M' | 'L' | 'T'; values: [number, number]}
    | {type: 'H' | 'V'; values: [number]}
    | {type: 'Q' | 'S'; values: [number, number, number, number]}
    | {type: 'C'; values: [number, number, number, number, number, number]}
    | {type: 'A'; values: [number, number, number, number, number, number, number]};

/**
 * Array of path commands representing a complete SVG path
 */
export type PathData = PathCommand[];

/**
 * Represents a circle or ellipse shape
 */
interface CircleLike {
    cx: number; // Center X coordinate
    cy: number; // Center Y coordinate
    r: number; // Radius (for circles)
    rx?: number; // Horizontal radius (for ellipses)
    ry?: number; // Vertical radius (for ellipses)
}

/**
 * Bounding box for geometric shapes
 * Used for fast preliminary intersection testing
 */
interface BBox {
    x: number; // Left edge
    y: number; // Top edge
    width: number; // Box width
    height: number; // Box height
    right: number; // Right edge (x + width)
    bottom: number; // Bottom edge (y + height)
}

/**
 * Generic SVG element instance that can represent various shape types
 * Used as a unified interface for different SVG primitives
 */
interface svgElInstance {
    // Common SVG shape properties
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

    // Convert shape to normalized path data
    toPathData(keepArcs?: boolean): PathData;
}

/**
 * Find all intersections between two SVG paths.
 * Based on snap.svg intersection function
 * Inspired by https://github.com/bpmn-io/path-intersection
 * lower sample distance = higher accuracy
 */

//  intersection from stringified path data
// function findPathIntersections(
//                     d1: string | svgElInstance | PathData | object,
//                 d2: string | svgElInstance | PathData | object,
//                 stopAtFirst= false,
//                 quality: Quality = 'medium',
//     ) {
//     // parse and normalize
//     let options = {
//         toAbsolute: true,
//         arcsToCubic: true,
//         arcAccuracy: 1,
//     };

//     // is shape object
//     let isObject1 = typeof d1 === 'object' && !Array.isArray(d1);
//     let isObject2 = typeof d2 === 'object' && !Array.isArray(d2);
//     let lineTypes = ['line', 'polyline', 'polygon'];

//     // congruent
//     if (isObject1 && isObject2) {
//         if (JSON.stringify(d1) === JSON.stringify(d2) && d1.type !== 'path') {
//             console.log('congruent!', d1.type, d1);
//             let pt = {x: 0, y: 0};

//             if (d1.type === 'polygon') {
//                 pt.x = d1.points[0];
//                 pt.y = d1.points[1];
//             } else if (d1.type === 'rect') {
//                 pt.x = d1.x;
//                 pt.y = d1.y;
//             } else if (d1.type === 'circle') {
//                 pt.x = d1.cx + d1.r;
//                 pt.y = d1.cy;
//             } else if (d1.type === 'ellipse') {
//                 pt.x = d1.cx + d1.rx;
//                 pt.y = d1.cy;
//             } else if (d1.type === 'line') {
//                 pt.x = d1.x1;
//                 pt.y = d1.y1;
//             }

//             return [pt];
//         }
//     }

//     //find circle intersections
//     if (isObject1 && isObject2 && d1.type === 'circle' && d2.type === 'circle') {
//         if (d1.cx === d2.cx && d1.cy === d2.cy && d1.r === d2.r) {
//             //return [{ x: d1.cx + d1.r, y: d1.cy }]
//         }
//         return findCircleIntersection(d1, d2);
//     } else if (
//         isObject1 &&
//         isObject2 &&
//         lineTypes.includes(d1.type) &&
//         lineTypes.includes(d2.type)
//     ) {
//         let interPoly = getPolyIntersections(d1, d2);
//         return interPoly;
//     }

//     // parse path data
//     let pathData1 = isObject1
//         ? d1.toPathData()
//         : Array.isArray(d1)
//           ? d1
//           : parsePathDataNormalized(d1, options);
//     let pathData2 = isObject2
//         ? d2.toPathData()
//         : Array.isArray(d2)
//           ? d2
//           : parsePathDataNormalized(d2, options);

//     //is congruent: return starting point
//     if (JSON.stringify(pathData1) === JSON.stringify(pathData2)) {
//         return [{x: pathData1[0].values[0], y: pathData1[0].values[1]}];
//     }

//     return findPathDataIntersections(pathData1, pathData2, stopAtFirst, quality);
// }

/**
 * Quick collision detection between two paths
 *
 * Optimized for performance by:
 * - Stopping at the first intersection found
 * - Using low quality (fewer sample points)
 * - Only returning whether collision exists (not all intersection points)
 *
 * Useful for:
 * - Game collision detection
 * - Hit testing in interactive applications
 * - Quick spatial queries where exact intersection points aren't needed
 *
 * @param d1 - First path (PathData array or path string)
 * @param d2 - Second path (PathData array or path string)
 * @returns Number of intersections found (0 or 1 due to stopAtFirst optimization)
 */
function checkCollision(d1: PathData, d2: PathData) {
    // Normalization options for consistent path comparison
    let options = {
        toAbsolute: true, // Convert relative commands to absolute
        arcsToCubic: true, // Convert arc commands to cubic bezier
        arcAccuracy: 1, // Subdivision level for arc conversion
    };

    // Parse path data if needed
    let pathData1 = Array.isArray(d1) ? d1 : parsePathDataNormalized(d1, options);
    let pathData2 = Array.isArray(d1) ? d2 : parsePathDataNormalized(d2, options);

    return findPathDataIntersections(pathData1, pathData2, true, 'low').length;
}

/**
 * Find all intersection points between two normalized path data arrays
 *
 * This is the core intersection algorithm that:
 * 1. Performs bounding box checks to quickly eliminate non-intersecting paths
 * 2. Breaks down path segments into sample points ("dots")
 * 3. Compares line segments between consecutive sample points
 * 4. Uses specialized algorithms for bezier-line intersections
 * 5. Returns precise intersection coordinates with parametric positions
 *
 * Algorithm approach:
 * - Curves are approximated by polygons (linearization)
 * - Sample density depends on quality setting and curve length
 * - Bezier-line intersections use analytical methods (cubic root solving)
 * - Line-line intersections use standard line intersection formula
 *
 * @param pathData1 - First normalized path data array
 * @param pathData2 - Second normalized path data array
 * @param stopAtFirst - If true, returns after finding first intersection (performance optimization)
 * @param quality - Sampling quality: 'low', 'medium', or 'high'
 * @returns Array of intersection points with metadata (position, parametric values, segments)
 */
function findPathDataIntersections(
    pathData1: PathData,
    pathData2: PathData,
    stopAtFirst = true,
    quality: Quality = 'medium',
) {
    /**
     * Find intersections between two path segments by comparing their sample points
     *
     * Each segment is approximated as a polygon (array of "dots"). This function
     * compares line segments between consecutive dots to find where they cross.
     *
     * @param data1 - First segment data with sample points
     * @param data2 - Second segment data with sample points
     * @param xy - Dictionary to track found intersections (prevent duplicates)
     * @param stopAtFirst - Exit early on first intersection
     * @param maxInter - Maximum expected intersections (depends on curve types)
     * @returns Array of intersection points with parametric positions
     */
    const findCommandIntersections = (
        data1: any,
        data2: any,
        xy: any,
        stopAtFirst = false,
        maxInter = 3,
    ) => {
        let intersections = [];
        let quit = false;
        let scan = 0;

        // Compare all line segments from both segments' sample points
        for (let i = 0; i < data1.splits && !quit; i++) {
            for (let j = 0; j < data2.splits && !quit; j++) {
                // Get consecutive sample points forming line segments
                let l1 = data1.dots[i], // Start of first line segment
                    l1_1 = data1.dots[i + 1], // End of first line segment
                    l2 = data2.dots[j], // Start of second line segment
                    l2_1 = data2.dots[j + 1]; // End of second line segment

                // Determine which coordinate to use for parametric calculation
                // Use y if line is nearly vertical, otherwise use x
                let ci: 'x' | 'y' = Math.abs(l1_1.x - l1.x) < 0.01 ? 'y' : 'x',
                    cj: 'x' | 'y' = Math.abs(l2_1.x - l2.x) < 0.01 ? 'y' : 'x';

                let intersection = intersectLines(l1, l1_1, l2, l2_1);
                scan++;

                if (intersection) {
                    if (stopAtFirst && intersections) {
                        quit = true;
                    }

                    // Create key for deduplication (round to 1 decimal place)
                    let intersection_key =
                        intersection.x.toFixed(1) + '_' + intersection.y.toFixed(1);

                    // Skip if this intersection was already found
                    if (xy[intersection_key]) {
                        continue;
                    }
                    // Mark intersection as found
                    xy[intersection_key] = true;

                    // Calculate parametric positions (t) on the original curves
                    // t is interpolated from the sample points' t values
                    let t1 =
                            l1.t +
                            Math.abs((intersection[ci] - l1[ci]) / (l1_1[ci] - l1[ci])) *
                                (l1_1.t - l1.t),
                        t2 =
                            l2.t +
                            Math.abs((intersection[cj] - l2[cj]) / (l2_1[cj] - l2[cj])) *
                                (l2_1.t - l2.t);

                    // Only add intersection if parametric values are within valid range [0, 1]
                    if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
                        intersections.push({
                            x: intersection.x,
                            y: intersection.y,
                            t1: t1,
                            t2: t2,
                        });

                        // Optimization: quit if we've found the maximum expected intersections
                        if (intersections.length >= maxInter) {
                            quit = true;
                        }
                    }
                }
            }
        }
        return intersections;
    };

    /**
     * Calculate Euclidean distance between two points
     * @param p0 - First point
     * @param p1 - Second point
     * @returns Distance between points
     */
    const lineLength = (p0: Point, p1: Point) => {
        return Math.sqrt((p1.x - p0.x) * (p1.x - p0.x) + (p1.y - p0.y) * (p1.y - p0.y));
    };

    /**
     * Calculate approximate bounding box for a path
     *
     * This is a fast approximation that uses control points rather than
     * computing the exact curve bounds. Good enough for preliminary intersection
     * testing to quickly eliminate non-overlapping paths.
     *
     * @param pathData - Normalized path data
     * @returns Bounding box containing all path points and control points
     */
    const getPathDataBBox = (pathData: PathData) => {
        let allX: number[] = [];
        let allY: number[] = [];

        // Collect all x and y coordinates from path segments
        for (let i = 1; i < pathData.length; i++) {
            // Get previous command's endpoint (current segment's start point)
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let p0 = {x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1]};

            // Get current command
            let com = pathData[i];
            let {type, values} = com;
            let valuesL = values.length;
            if (!valuesL) continue;
            let p = {x: values[valuesL - 2], y: values[valuesL - 1]};

            // Extract control points
            let cp1 = {x: values[0] as number, y: values[1] as number};
            let cp2 = type === 'C' ? {x: values[valuesL - 4], y: values[valuesL - 3]} : cp1;

            // Add all points to coordinate arrays
            allX.push(p0.x, cp1.x, cp2.x, p.x);
            allY.push(p0.y, cp1.y, cp2.y, p.y);
        }

        // Calculate bounding box from min/max coordinates
        // Note: This is a coarse approximation - actual curve may extend slightly beyond this
        let minX = Math.min(...allX);
        let minY = Math.min(...allY);
        let maxX = Math.max(...allX);
        let maxY = Math.max(...allY);
        let bb = {x: minX, y: minY, right: maxX, bottom: maxY};

        return bb;
    };

    /**
     * Check if a bezier curve is actually a straight line
     * Tests if all control points are collinear with endpoints
     *
     * @param bez - Array of control point coordinates [x0, y0, x1, y1, x2, y2, x3, y3]
     * @returns True if curve is effectively a line
     */
    const isLine = (bez: any) => {
        return bez[0] === bez[2] && bez[1] === bez[3] && bez[4] === bez[6] && bez[5] === bez[7];
    };

    /**
     * Find intersections between a bezier curve and a line segment
     *
     * Uses analytical methods to solve the intersection mathematically rather
     * than through sampling. More accurate than polygon approximation.
     *
     * Handles both cubic and quadratic bezier curves.
     *
     * @param points - Array of bezier control points (3 for quadratic, 4 for cubic)
     * @param line - Array of two points defining the line segment
     * @returns Array of intersection points with parametric positions
     */
    const getBezierLineIntersection = (points: any, line: any) => {
        /**
         * Find intersections between a cubic bezier curve and a line
         *
         * Algorithm:
         * 1. Express the line as implicit form: Ax + By + C = 0
         * 2. Substitute bezier parametric equations into line equation
         * 3. This yields a cubic polynomial in t
         * 4. Solve for roots using Cardano's formula
         * 5. For each valid root (0 <= t <= 1), calculate intersection point
         *
         * Based on: https://www.particleincell.com/2013/cubic-line-intersection/
         *
         * @param points - [p0, cp1, cp2, p] - start, control1, control2, end points
         * @param line - [start, end] - line segment endpoints
         * @returns Array of intersection points
         */
        const getIntersectionsCubic = (points, line) => {
            let [p0, cp1, cp2, p] = points;

            // Small adjustment to avoid degenerate cases
            // If start and end have same x or y, nudge slightly to avoid division by zero
            let epsilon = 0.0001;
            p0.y = p0.y === p.y ? p0.y - epsilon : p0.y;
            p0.x = p0.x === p.x ? p0.x - epsilon : p0.x;

            /**
             * Solve cubic equation: ax³ + bx² + cx + d = 0
             * Uses Cardano's formula for cubic roots
             *
             * @param P - Coefficients [a, b, c, d]
             * @returns Array of real roots in range [0, 1]
             */
            const solveCubicRoots = (P) => {
                let [a, b, c, d] = P;
                // Normalize to depressed cubic form
                var A = b / a,
                    B = c / a,
                    C = d / a,
                    Q = (3 * B - Math.pow(A, 2)) / 9,
                    R = (9 * A * B - 27 * C - 2 * Math.pow(A, 3)) / 54,
                    D = Math.pow(Q, 3) + Math.pow(R, 2), // Discriminant
                    Im;
                let t = [];

                if (D >= 0) {
                    // Case 1: One real root and two complex conjugate roots (or repeated roots)
                    const S =
                        Math.sign(R + Math.sqrt(D)) * Math.pow(Math.abs(R + Math.sqrt(D)), 1 / 3);
                    const T =
                        Math.sign(R - Math.sqrt(D)) * Math.pow(Math.abs(R - Math.sqrt(D)), 1 / 3);
                    t = [
                        -A / 3 + (S + T), // Real root
                        -A / 3 - (S + T) / 2, // Real part of complex root
                        -A / 3 - (S + T) / 2, // Real part of complex root
                    ];
                    // Calculate imaginary component
                    Im = Math.abs((Math.sqrt(3) * (S - T)) / 2);
                    // Discard complex roots (only keep real roots)
                    if (Im !== 0) {
                        t[1] = -1;
                        t[2] = -1;
                    }
                } else {
                    // Case 2: Three distinct real roots
                    // Use trigonometric method
                    let th = Math.acos(R / Math.sqrt(-Math.pow(Q, 3)));
                    t = [
                        2 * Math.sqrt(-Q) * Math.cos(th / 3) - A / 3,
                        2 * Math.sqrt(-Q) * Math.cos((th + 2 * Math.PI) / 3) - A / 3,
                        2 * Math.sqrt(-Q) * Math.cos((th + 4 * Math.PI) / 3) - A / 3,
                    ];
                    Im = 0.0;
                }

                // Only return roots in valid parametric range [0, 1]
                return t.filter((val) => {
                    return val >= 0 && val <= 1;
                });
            };

            /**
             * Calculate bezier curve coefficients for parametric form
             * Cubic bezier: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
             * Can be rewritten as: B(t) = at³ + bt² + ct + d
             *
             * @param p0 - Start point coordinate
             * @param p1 - First control point coordinate
             * @param p2 - Second control point coordinate
             * @param p3 - End point coordinate
             * @returns Coefficients [a, b, c, d]
             */
            const bezierCoefficients = (p0: any, p1: any, p2: any, p3: any) => {
                return [
                    -p0 + 3 * p1 + -3 * p2 + p3, // Coefficient for t³
                    3 * p0 - 6 * p1 + 3 * p2, // Coefficient for t²
                    -3 * p0 + 3 * p1, // Coefficient for t
                    p0, // Constant term
                ];
            };

            // Convert line to implicit form: Ax + By + C = 0
            let A = line[1].y - line[0].y;
            let B = line[0].x - line[1].x;
            let C = line[0].x * (line[0].y - line[1].y) + line[0].y * (line[1].x - line[0].x);

            // Get bezier coefficients for x and y coordinates
            const xBezierCoefficients = bezierCoefficients(p0.x, cp1.x, cp2.x, p.x);
            const yBezierCoefficients = bezierCoefficients(p0.y, cp1.y, cp2.y, p.y);

            // Substitute bezier parametric equations into line equation
            // This gives us: A*Bx(t) + B*By(t) + C = 0
            // Which is a cubic polynomial in t
            const P = [
                A * xBezierCoefficients[0] + B * yBezierCoefficients[0],
                A * xBezierCoefficients[1] + B * yBezierCoefficients[1],
                A * xBezierCoefficients[2] + B * yBezierCoefficients[2],
                A * xBezierCoefficients[3] + B * yBezierCoefficients[3] + C,
            ];

            // Solve for t values where bezier intersects the line
            let cubicRoots = solveCubicRoots(P);

            // Calculate actual intersection points from parametric values
            let pts = [];
            cubicRoots.forEach((t) => {
                // Evaluate bezier curve at parameter t
                let pt = {
                    x:
                        xBezierCoefficients[0] * t ** 3 +
                        xBezierCoefficients[1] * t ** 2 +
                        xBezierCoefficients[2] * t +
                        xBezierCoefficients[3],
                    y:
                        yBezierCoefficients[0] * t ** 3 +
                        yBezierCoefficients[1] * t ** 2 +
                        yBezierCoefficients[2] * t +
                        yBezierCoefficients[3],
                };

                // Calculate parametric position on the line segment
                // Create a line through the point and find where it crosses the original line
                let pt1 = {x: pt.x - 10, y: pt.y - 10};
                let pt2 = {x: pt.x + 10, y: pt.y + 10};
                let inter = intersectLines(pt1, pt2, line[0], line[1]);

                pts.push({
                    x: pt.x,
                    y: pt.y,
                    t1: inter.t, // Parametric position on line
                    t2: t, // Parametric position on bezier
                });
            });

            return pts;
        };

        /**
         * Find intersections between a quadratic bezier curve and a line
         *
         * Algorithm:
         * 1. Rotate coordinate system so line lies on x-axis
         * 2. In rotated system, intersections occur where bezier's y = 0
         * 3. Solve quadratic equation for these t values
         * 4. Transform back to original coordinates
         *
         * Based on:
         * https://stackoverflow.com/questions/77003429/intersection-of-quadratic-bezier-path-and-line/77010181
         *
         * @param points - [p0, cp1, p] - start, control, end points
         * @param line - [start, end] - line segment endpoints
         * @returns Array of intersection points
         */
        const getIntersectionsQuadratic = (points: any, line: any) => {
            const {atan2, cos, sin, sqrt} = Math;

            /**
             * Find parametric values where quadratic bezier intersects line
             *
             * Rotates coordinate system so the line is horizontal, then solves
             * for where the bezier's y-coordinate equals zero.
             *
             * @param pts - Bezier control points as coordinate arrays
             * @param [[x1, y1], [x2, y2]] - Line endpoints
             * @returns Array of parametric values (t) where intersection occurs
             */
            const getRoots = (pts, [[x1, y1], [x2, y2]]) => {
                // Calculate rotation angle to align line with x-axis
                const angle = atan2(y2 - y1, x2 - x1);
                // Rotate all bezier points and extract y-coordinates
                const v = pts.map(([x, y]) => (x - x1) * sin(-angle) + (y - y1) * cos(-angle));
                // Solve for where rotated bezier crosses y=0 (the rotated line)
                return (
                    solveQuadratic(v[0], v[1], v[2])
                        // Only keep roots in valid parametric range [0,1]
                        .filter((t) => 0 <= t && t <= 1)
                );
            };

            /**
             * Solve quadratic equation using quadratic formula
             * Equation form: at² + bt + c = 0
             *
             * @param v1 - Coefficient for start point
             * @param v2 - Coefficient for control point
             * @param v3 - Coefficient for end point
             * @returns Array of roots (0, 1, or 2 values)
             */
            const solveQuadratic = (v1, v2, v3) => {
                const a = v1 - 2 * v2 + v3,
                    b = 2 * (v2 - v1),
                    c = v1;
                // Degenerate case: linear equation
                if (a === 0) return b === 0 ? [] : [-c / b];
                const u = -b / (2 * a),
                    v = b ** 2 - 4 * a * c;
                if (v < 0) return []; // No real roots
                if (v === 0) return [u]; // One root (tangent)
                // Two distinct roots
                const w = sqrt(v) / (2 * a);
                return [u + w, u - w];
            };

            // Convert points from object format to array format
            points = points.map((pt) => {
                return Object.values(pt);
            });
            let lineArr = line.map((pt) => {
                return Object.values(pt);
            });
            const [[x1, y1], [x2, y2], [x3, y3]] = points;
            const roots = getRoots(points, lineArr);

            /**
             * Convert parametric value to actual coordinate
             * Uses quadratic bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
             *
             * @param t - Parametric position on bezier curve [0, 1]
             * @param x2, x3, y2, y3 - Control and end point coordinates
             * @returns Intersection point with both parametric positions
             */
            const coordForRoot = (t, x2, x3, y2, y3) => {
                const mt = 1 - t;
                // Evaluate quadratic bezier at parameter t
                let pt = {
                    x: x1 * mt ** 2 + 2 * x2 * t * mt + x3 * t ** 2,
                    y: y1 * mt ** 2 + 2 * y2 * t * mt + y3 * t ** 2,
                };

                // Calculate parametric position on the line segment
                let pt1 = {x: pt.x - 10, y: pt.y - 10};
                let pt2 = {x: pt.x + 10, y: pt.y + 10};
                let inter = intersectLines(pt1, pt2, line[0], line[1]);

                return {
                    x: pt.x,
                    y: pt.y,
                    t1: inter.t, // Parametric position on line
                    t2: t, // Parametric position on bezier
                };
            };

            const intersections = roots.map((t) => coordForRoot(t, x2, x3, y2, y3));
            return intersections;
        };

        // Choose appropriate algorithm based on bezier degree
        let inter =
            points.length === 4
                ? getIntersectionsCubic(points, line)
                : getIntersectionsQuadratic(points, line);
        return inter;
    };

    // Array to collect all intersection results
    let res = [];

    // Fast rejection: check if bounding boxes overlap
    // If they don't, paths can't possibly intersect
    let bb1 = getPathDataBBox(pathData1);
    let bb2 = getPathDataBBox(pathData2);

    if (!isBBoxIntersect(bb1, bb2)) {
        return res;
    }

    // Dictionary to track found intersections and prevent duplicates
    // Key format: "x_y" (rounded coordinates)
    let xy = {};

    /**
     * Extract metadata for each path segment
     *
     * Analyzes each command in the path and extracts:
     * - Control points (cpts)
     * - Segment type
     * - Whether segment self-intersects (for cubic curves)
     * - Bounding box for the segment
     *
     * This metadata is used to optimize intersection detection.
     *
     * @param pathData - Normalized path data array
     * @returns Array of segment info objects
     */
    function getPathInfo(pathData) {
        let pathArr = [];
        let M = {x: pathData[0].values[0], y: pathData[0].values[1]};

        pathData.forEach((com, i) => {
            let cpts = [];
            let {type, values} = com;
            let obj = {
                type: type,
                cpts: [],
                selfintersects: false, // Does this curve cross itself?
                len: 0, // Approximate length
                splits: 0, // Number of sample points
                dots: [], // Sample points along the curve
                bb: {}, // Bounding box
            };

            let valuesL = values.length;
            let comPrev = i > 0 ? pathData[i - 1] : pathData[i];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;

            // Extract start point (end of previous command)
            let p0 = {x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1]};
            // Extract end point
            let p = valuesL ? {x: values[valuesL - 2], y: values[valuesL - 1]} : M;
            // Extract control points
            let cp1 = valuesL ? {x: values[0], y: values[1]} : p0;
            let cp2 = valuesL > 2 ? {x: values[2], y: values[3]} : p;

            switch (type) {
                case 'M':
                    // MoveTo: update current position, no drawing
                    M = {x: p.x, y: p.y};
                    cpts = [];
                    break;
                case 'C':
                    // Cubic bezier: 4 control points
                    cpts = [p0, cp1, cp2, p];
                    // Check if control points cross (can affect max intersection count)
                    obj.selfintersects = intersectLines(p0, cp1, cp2, p) !== false ? true : false;
                    break;

                case 'Q':
                    // Quadratic bezier: 3 control points
                    cpts = [p0, cp1, p];
                    break;

                case 'Z':
                case 'z':
                    // ClosePath: line to initial M point
                    p = M;
                    cpts = [p0, p];
                    break;
                default:
                    // LineTo and other commands: treat as line segment
                    cpts = [p0, p];
            }

            if (cpts.length) {
                obj.cpts = cpts;
                obj.bb = commandBBox(cpts);
            }
            pathArr.push(obj);
        });

        return pathArr;
    }

    /**
     * Generate sample points along a curve segment
     *
     * Approximates curves by creating a polygon (series of line segments).
     * The number of sample points depends on:
     * - Quality setting (low/medium/high)
     * - Estimated curve length
     * - Curve type (lines need only 1 split, curves need more)
     *
     * Algorithm:
     * 1. Estimate curve length (using midpoint approximation)
     * 2. Calculate number of splits based on desired sample distance
     * 3. Clamp to min/max values based on quality
     * 4. Generate evenly spaced sample points using parametric evaluation
     *
     * @param obj - Segment object to populate with sample points
     * @param quality - 'low', 'medium', or 'high'
     */
    function addSegmentDots(obj, quality = 'medium') {
        let {cpts} = obj;
        let l = 240, // Estimated length
            sampleDist = 20, // Target distance between samples
            div = 16, // Number of divisions
            minDiv = 16, // Minimum divisions
            maxDiv = 16; // Maximum divisions

        if (quality === 'medium' || quality === 'high') {
            // Approximate length using polygon through start, middle, end
            let pM = pointAtT(cpts, 0.5);
            l = lineLength(cpts[0], pM) + lineLength(cpts[cpts.length - 1], pM);

            // Quality determines sample distance
            sampleDist = quality === 'medium' ? 10 : 5;
            div = Math.ceil(l / sampleDist);

            // Quality determines min/max sample counts
            minDiv = quality === 'high' ? 48 : 24;
            maxDiv = quality === 'high' ? 1000 : 500;
        }

        // Calculate final split count
        // Lines only need 1 split, curves need more based on length
        let splits =
            cpts.length === 2 || isLine(cpts)
                ? 1
                : (div > minDiv ? div : div > maxDiv ? maxDiv : minDiv) || 1;

        obj.len = l;
        obj.splits = splits;
        obj.bb = commandBBox(cpts);

        // Generate sample points at regular parametric intervals
        for (let i = 0; i < splits + 1; i++) {
            let t = i / splits;
            let pt = pointAtT(cpts, t);
            obj.dots.push({x: pt.x, y: pt.y, t: t});
        }
    }

    // Extract metadata for all segments in both paths
    let pathInfo1 = getPathInfo(pathData1);
    let pathInfo2 = getPathInfo(pathData2);
    let quit = false;

    // Main intersection detection loop: compare each segment pair
    for (let i = 0; i < pathData1.length && !quit; i++) {
        let data1 = pathInfo1[i];

        // Skip M (MoveTo) commands - they don't draw anything
        if (!data1.cpts.length) {
            continue;
        }

        for (var j = 0; j < pathData2.length && !quit; j++) {
            let data2 = pathInfo2[j];
            if (!data2.cpts.length) {
                continue;
            }

            // Bounding box test: only check segments whose boxes overlap
            if (isBBoxIntersect(data1.bb, data2.bb)) {
                let type1 = data1.type,
                    type2 = data2.type;

                // Determine maximum possible intersections based on curve types
                // Cubic-Cubic: up to 4, Line-Curve: up to 2, Line-Line: 1
                let maxInter =
                    type1 === 'C' && type2 === 'C' ? 4 : type1 === 'L' && type2 === 'L' ? 1 : 2;

                /**
                 * Optimization: Use analytical bezier-line intersection
                 * More accurate and efficient than polygon approximation
                 */
                let useBezCalc = true;
                if (
                    (type1 === 'L' || type2 === 'L') &&
                    (data1.cpts.length > 2 || data2.cpts.length > 2) &&
                    useBezCalc
                ) {
                    // One segment is a line, the other is a bezier curve
                    let line = type1 === 'L' ? data1 : data2;
                    let bez = type1 === 'L' ? data2 : data1;

                    let inter = getBezierLineIntersection(bez.cpts, line.cpts);
                    if (inter.length) {
                        inter.forEach((item) => {
                            let it = {
                                cpts1: line.cpts,
                                cpts2: bez.cpts,
                                segment1: i,
                                segment2: j,
                                t1: item.t1,
                                t2: item.t2,
                                x: item.x,
                                y: item.y,
                            };
                            res.push(it);
                        });

                        continue;
                    }
                }

                // Adjust max intersections if curves don't self-intersect
                if (maxInter === 4) {
                    if (!data1.selfintersects) {
                        maxInter--;
                    }
                    if (!data2.selfintersects) {
                        maxInter--;
                    }
                }

                // Generate sample points if not already computed
                // (Lazy evaluation for performance)
                if (!data1.dots.length) {
                    addSegmentDots(data1, quality);
                }
                if (!data2.dots.length) {
                    addSegmentDots(data2, quality);
                }

                // Find intersections using polygon approximation method
                let intersections = findCommandIntersections(
                    data1,
                    data2,
                    xy,
                    stopAtFirst,
                    maxInter,
                );

                if (stopAtFirst && intersections.length) {
                    quit = true;
                }

                // Add segment metadata to intersection results
                for (let k = 0; k < intersections.length; k++) {
                    intersections[k].segment1 = i;
                    intersections[k].segment2 = j;
                    intersections[k].cpts1 = data1.cpts;
                    intersections[k].cpts2 = data2.cpts;
                }
                res = res.concat(intersections);
            }
        }
    }
    return res;
}

/**
 * Evaluate a curve at a given parametric position
 *
 * Calculates the (x, y) coordinate at parameter t on a curve.
 * Handles lines, quadratic beziers, and cubic beziers.
 *
 * @param pts - Array of control points (2 for line, 3 for quadratic, 4 for cubic)
 * @param t - Parametric position [0, 1] where 0 is start, 1 is end
 * @returns Point on the curve at parameter t
 */
function pointAtT(pts, t = 0.5) {
    /**
     * Linear interpolation between two points
     * Formula: P(t) = (1-t)P₀ + tP₁
     *
     * @param p0 - Start point
     * @param p - End point
     * @param t - Interpolation parameter [0, 1]
     * @returns Interpolated point
     */
    const interpolate = (p0, p, t) => {
        return {
            x: (p.x - p0.x) * t + p0.x,
            y: (p.y - p0.y) * t + p0.y,
        };
    };

    /**
     * Evaluate cubic bezier curve at parameter t
     * Formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
     *
     * @param p0 - Start point
     * @param cp1 - First control point
     * @param cp2 - Second control point
     * @param p - End point
     * @param t - Parameter [0, 1]
     * @returns Point on cubic bezier
     */
    const getPointAtCubicSegmentT = (p0, cp1, cp2, p, t) => {
        let t1 = 1 - t;
        return {
            x: t1 ** 3 * p0.x + 3 * t1 ** 2 * t * cp1.x + 3 * t1 * t ** 2 * cp2.x + t ** 3 * p.x,
            y: t1 ** 3 * p0.y + 3 * t1 ** 2 * t * cp1.y + 3 * t1 * t ** 2 * cp2.y + t ** 3 * p.y,
        };
    };

    /**
     * Evaluate quadratic bezier curve at parameter t
     * Formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
     *
     * @param p0 - Start point
     * @param cp1 - Control point
     * @param p - End point
     * @param t - Parameter [0, 1]
     * @returns Point on quadratic bezier
     */
    const getPointAtQuadraticSegmentT = (p0, cp1, p, t) => {
        let t1 = 1 - t;
        return {
            x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
            y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
        };
    };

    // Choose evaluation method based on number of control points
    let pt;
    if (pts.length === 4) {
        pt = getPointAtCubicSegmentT(pts[0], pts[1], pts[2], pts[3], t);
    } else if (pts.length === 3) {
        pt = getPointAtQuadraticSegmentT(pts[0], pts[1], pts[2], t);
    } else {
        pt = interpolate(pts[0], pts[1], t);
    }
    return pt;
}

/**
 * Parse and normalize SVG path data string
 *
 * Converts an SVG path 'd' attribute string into a structured array of commands.
 * Performs normalization including:
 * - Converting relative commands to absolute
 * - Converting shorthand commands (H, V, S, T) to full commands
 * - Converting arc commands to cubic bezier curves
 * - Handling implicit commands (e.g., multiple coordinates after M become L)
 * - Cleaning and sanitizing input string
 *
 * This is the core parsing function that enables all intersection algorithms
 * to work with a consistent, normalized representation.
 *
 * @param d - SVG path data string (e.g., "M10 10 L20 20 C30 30 40 40 50 50")
 * @param options - Parsing options {toAbsolute, toLonghands, arcToCubic, arcAccuracy}
 * @returns Array of normalized path commands
 */
function parsePathDataNormalized(d, options = {}) {
    /**
     * Convert SVG arc command to cubic bezier curves
     *
     * SVG arcs are difficult to work with mathematically, so this converts them
     * to cubic bezier curves which can be handled uniformly with other curves.
     *
     * Algorithm:
     * 1. Handle degenerate cases (zero radii)
     * 2. Correct radii if they're too small
     * 3. Find center point and angles of the elliptical arc
     * 4. Split arc into segments (typically 90-degree chunks)
     * 5. Approximate each segment with a cubic bezier
     *
     * Based on puzrin's a2c.js:
     * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
     *
     * @param p0 - Start point of arc
     * @param values - Arc parameters [rx, ry, rotation, largeArcFlag, sweepFlag, x, y]
     * @param splitSegments - Subdivision level (for length calculation accuracy)
     * @returns Array of cubic bezier commands approximating the arc
     */
    const arcToBezier = (p0, values, splitSegments = 1) => {
        let {abs, PI, sin, acos, cos, sqrt} = Math;
        const TAU = PI * 2;
        let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

        // Degenerate case: zero radius means no arc
        if (rx === 0 || ry === 0) {
            return [];
        }

        // Convert rotation from degrees to radians
        let phi = rotation ? (rotation * TAU) / 360 : 0;
        let sinphi = phi ? sin(phi) : 0;
        let cosphi = phi ? cos(phi) : 1;

        // Transform to rotated coordinate system (arc is axis-aligned in this system)
        let pxp = (cosphi * (p0.x - x)) / 2 + (sinphi * (p0.y - y)) / 2;
        let pyp = (-sinphi * (p0.x - x)) / 2 + (cosphi * (p0.y - y)) / 2;

        // Degenerate case: start and end points are the same
        if (pxp === 0 && pyp === 0) {
            return [];
        }

        // Ensure radii are positive
        rx = abs(rx);
        ry = abs(ry);

        // Correct radii if they're too small to reach from start to end
        let lambda = (pxp * pxp) / (rx * rx) + (pyp * pyp) / (ry * ry);
        if (lambda > 1) {
            let lambdaRt = sqrt(lambda);
            rx *= lambdaRt;
            ry *= lambdaRt;
        }

        // Calculate center point in rotated coordinate system
        let rxsq = rx * rx,
            rysq = rx === ry ? rxsq : ry * ry;

        let pxpsq = pxp * pxp,
            pypsq = pyp * pyp;
        let radicant = rxsq * rysq - rxsq * pypsq - rysq * pxpsq;

        if (radicant <= 0) {
            radicant = 0;
        } else {
            radicant /= rxsq * pypsq + rysq * pxpsq;
            // Sign depends on largeArcFlag and sweepFlag
            radicant = sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
        }

        // Calculate center in rotated system
        let centerxp = radicant ? ((radicant * rx) / ry) * pyp : 0;
        let centeryp = radicant ? ((radicant * -ry) / rx) * pxp : 0;
        // Transform center back to original coordinate system
        let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2;
        let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2;

        // Calculate angle vectors for start and end
        let vx1 = (pxp - centerxp) / rx;
        let vy1 = (pyp - centeryp) / ry;
        let vx2 = (-pxp - centerxp) / rx;
        let vy2 = (-pyp - centeryp) / ry;

        /**
         * Calculate angle between two vectors
         * Uses dot product and cross product for signed angle
         */
        const vectorAngle = (ux, uy, vx, vy) => {
            let dot = +(ux * vx + uy * vy).toFixed(9);
            if (dot === 1 || dot === -1) {
                return dot === 1 ? 0 : PI;
            }
            dot = dot > 1 ? 1 : dot < -1 ? -1 : dot;
            let sign = ux * vy - uy * vx < 0 ? -1 : 1;
            return sign * acos(dot);
        };

        // Calculate start angle and sweep angle
        let ang1 = vectorAngle(1, 0, vx1, vy1),
            ang2 = vectorAngle(vx1, vy1, vx2, vy2);

        // Adjust sweep angle based on sweep direction
        if (sweepFlag === 0 && ang2 > 0) {
            ang2 -= PI * 2;
        } else if (sweepFlag === 1 && ang2 < 0) {
            ang2 += PI * 2;
        }

        // Calculate number of segments (typically split at 90-degree intervals)
        let ratio = +(abs(ang2) / (TAU / 4)).toFixed(0);

        // Increase segments for more accurate length calculations
        let segments = ratio * splitSegments;
        ang2 /= segments; // Angle per segment
        let pathDataArc = [];

        // Magic number for 90-degree arc approximation
        // This constant gives the best cubic bezier approximation of a circular 90° arc
        // See: https://pomax.github.io/bezierinfo/#circles_cubic
        const angle90 = 1.5707963267948966;
        const k = 0.551785;
        // Calculate control point distance (different formula for non-90° arcs)
        let a = ang2 === angle90 ? k : ang2 === -angle90 ? -k : (4 / 3) * tan(ang2 / 4);

        let cos2 = ang2 ? cos(ang2) : 1;
        let sin2 = ang2 ? sin(ang2) : 0;
        let type = 'C';

        /**
         * Approximate a unit circle arc with a cubic bezier
         * Returns control points for one arc segment
         *
         * @param ang1 - Start angle
         * @param ang2 - Sweep angle
         * @param a - Control point distance factor
         * @param cos2, sin2 - Precomputed trig values
         * @returns Array of 3 points [cp1, cp2, endpoint]
         */
        const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
            let x1 = ang1 != ang2 ? cos(ang1) : cos2;
            let y1 = ang1 != ang2 ? sin(ang1) : sin2;
            let x2 = cos(ang1 + ang2);
            let y2 = sin(ang1 + ang2);

            return [
                {x: x1 - y1 * a, y: y1 + x1 * a}, // First control point
                {x: x2 + y2 * a, y: y2 - x2 * a}, // Second control point
                {x: x2, y: y2}, // End point
            ];
        };

        // Generate cubic bezier segments for the arc
        for (let i = 0; i < segments; i++) {
            let com = {type: type, values: []};
            let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

            // Transform from unit circle to actual ellipse and rotate back
            curve.forEach((pt) => {
                let x = pt.x * rx;
                let y = pt.y * ry;
                com.values.push(
                    cosphi * x - sinphi * y + centerx,
                    sinphi * x + cosphi * y + centery,
                );
            });
            pathDataArc.push(com);
            ang1 += ang2; // Move to next segment
        }

        return pathDataArc;
    };

    // Clean and normalize the path string
    d = d
        // Remove new lines, tabs, and replace commas with spaces
        .replace(/[\n\r\t|,]/g, ' ')
        // Trim whitespace
        .trim()
        // Add space before minus signs (e.g., "10-5" -> "10 -5")
        .replace(/(\d)-/g, '$1 -')
        // Decompose multiple adjacent decimals (e.g., "0.5.5.5" -> "0.5 0.5 0.5")
        .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, '$1$3 ');

    let pathData = [];
    // Regex to split path into commands: command letter + its values
    let cmdRegEx = /([mlcqazvhst])([^mlcqazvhst]*)/gi;
    let commands = d.match(cmdRegEx);

    // Expected number of values for each command type
    let comLengths = {m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0};

    // Merge default options with provided options
    options = {
        ...{
            toAbsolute: true, // Convert relative to absolute coordinates
            toLonghands: true, // Convert shorthand commands (H, V, S, T) to full form
            arcToCubic: true, // Convert arcs to cubic beziers
            arcAccuracy: 1, // Arc subdivision level
        },
        ...options,
    };

    let {toAbsolute, toLonghands, arcToCubic, arcAccuracy} = options;

    // Detect which normalizations are needed (optimization)
    let hasArcs = /[a]/gi.test(d);
    let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
    let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;

    // Track current position for converting relative to absolute coordinates
    let offX, offY, lastX, lastY;

    for (let c = 0; c < commands.length; c++) {
        let com = commands[c];
        let type = com.substring(0, 1);
        let typeRel = type.toLowerCase();
        let typeAbs = type.toUpperCase();
        let isRel = type === typeRel;
        let chunkSize = comLengths[typeRel];

        // split values to array
        let values = com.substring(1, com.length).trim().split(' ').filter(Boolean);

        /**
         * A - Arc commands
         * large arc and sweep flags
         * are boolean and can be concatenated like
         * 11 or 01
         * or be concatenated with the final on path points like
         * 1110 10 => 1 1 10 10
         */
        if (typeRel === 'a' && values.length != comLengths.a) {
            let n = 0,
                arcValues = [];
            for (let i = 0; i < values.length; i++) {
                let value = values[i];

                // reset counter
                if (n >= chunkSize) {
                    n = 0;
                }
                // if 3. or 4. parameter longer than 1
                if ((n === 3 || n === 4) && value.length > 1) {
                    let largeArc = n === 3 ? value.substring(0, 1) : '';
                    let sweep = n === 3 ? value.substring(1, 2) : value.substring(0, 1);
                    let finalX = n === 3 ? value.substring(2) : value.substring(1);
                    let comN = [largeArc, sweep, finalX].filter(Boolean);
                    arcValues.push(comN);
                    n += comN.length;
                } else {
                    // regular
                    arcValues.push(value);
                    n++;
                }
            }
            values = arcValues.flat().filter(Boolean);
        }

        // string  to number
        values = values.map(Number);

        // if string contains repeated shorthand commands - split them
        let hasMultiple = values.length > chunkSize;
        let chunk = hasMultiple ? values.slice(0, chunkSize) : values;
        let comChunks = [{type: type, values: chunk}];

        // has implicit or repeated commands – split into chunks
        if (hasMultiple) {
            let typeImplicit = typeRel === 'm' ? (isRel ? 'l' : 'L') : type;
            for (let i = chunkSize; i < values.length; i += chunkSize) {
                let chunk = values.slice(i, i + chunkSize);
                comChunks.push({type: typeImplicit, values: chunk});
            }
        }

        // no relative, shorthand or arc command - return current
        if (!hasRelative && !hasShorthands && !hasArcs) {
            comChunks.forEach((com) => {
                pathData.push(com);
            });
        } else {
            /**
             * convert to absolute
             * init offset from 1st M
             */
            if (c === 0) {
                offX = values[0];
                offY = values[1];
                lastX = offX;
                lastY = offY;
            }

            let typeFirst = comChunks[0].type;
            typeAbs = typeFirst.toUpperCase();

            // first M is always absolute
            isRel = typeFirst.toLowerCase() === typeFirst && pathData.length ? true : false;

            for (let i = 0; i < comChunks.length; i++) {
                let com = comChunks[i];
                let type = com.type;
                let values = com.values;
                let valuesL = values.length;
                let comPrev = comChunks[i - 1]
                    ? comChunks[i - 1]
                    : c > 0 && pathData[pathData.length - 1]
                      ? pathData[pathData.length - 1]
                      : comChunks[i];

                let valuesPrev = comPrev.values;
                let valuesPrevL = valuesPrev.length;
                isRel =
                    comChunks.length > 1 ? type.toLowerCase() === type && pathData.length : isRel;

                if (isRel) {
                    com.type = comChunks.length > 1 ? type.toUpperCase() : typeAbs;

                    switch (typeRel) {
                        case 'a':
                            com.values = [
                                values[0],
                                values[1],
                                values[2],
                                values[3],
                                values[4],
                                values[5] + offX,
                                values[6] + offY,
                            ];
                            break;

                        case 'h':
                        case 'v':
                            com.values = type === 'h' ? [values[0] + offX] : [values[0] + offY];
                            break;

                        case 'm':
                        case 'l':
                        case 't':
                            com.values = [values[0] + offX, values[1] + offY];
                            break;

                        case 'c':
                            com.values = [
                                values[0] + offX,
                                values[1] + offY,
                                values[2] + offX,
                                values[3] + offY,
                                values[4] + offX,
                                values[5] + offY,
                            ];
                            break;

                        case 'q':
                        case 's':
                            com.values = [
                                values[0] + offX,
                                values[1] + offY,
                                values[2] + offX,
                                values[3] + offY,
                            ];
                            break;
                    }
                }
                // is absolute
                else {
                    offX = 0;
                    offY = 0;
                }

                /**
                 * convert shorthands
                 */
                if (hasShorthands) {
                    let cp1X, cp1Y, cpN1X, cpN1Y, cp2X, cp2Y;
                    if (com.type === 'H' || com.type === 'V') {
                        com.values =
                            com.type === 'H' ? [com.values[0], lastY] : [lastX, com.values[0]];
                        com.type = 'L';
                    } else if (com.type === 'T' || com.type === 'S') {
                        [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                        [cp2X, cp2Y] =
                            valuesPrevL > 2
                                ? [valuesPrev[2], valuesPrev[3]]
                                : [valuesPrev[0], valuesPrev[1]];

                        // new control point
                        cpN1X = com.type === 'T' ? lastX * 2 - cp1X : lastX * 2 - cp2X;
                        cpN1Y = com.type === 'T' ? lastY * 2 - cp1Y : lastY * 2 - cp2Y;

                        com.values = [cpN1X, cpN1Y, com.values].flat();
                        com.type = com.type === 'T' ? 'Q' : 'C';
                    }
                }

                /**
                 * convert arcs if elliptical
                 */
                let isElliptic = false;

                if (hasArcs && com.type === 'A') {
                    p0 = {x: lastX, y: lastY};
                    if (typeRel === 'a') {
                        isElliptic = com.values[0] === com.values[1] ? false : true;

                        if (isElliptic || arcToCubic) {
                            let comArc = arcToBezier(p0, com.values, arcAccuracy);
                            comArc.forEach((seg) => {
                                pathData.push(seg);
                            });
                        } else {
                            pathData.push(com);
                        }
                    }
                } else {
                    // add to pathData array
                    pathData.push(com);
                }

                // update offsets
                lastX =
                    valuesL > 1
                        ? values[valuesL - 2] + offX
                        : typeRel === 'h'
                          ? values[0] + offX
                          : lastX;
                lastY =
                    valuesL > 1
                        ? values[valuesL - 1] + offY
                        : typeRel === 'v'
                          ? values[0] + offY
                          : lastY;
                offX = lastX;
                offY = lastY;
            }
        }
    }

    pathData[0].type = 'M';
    return pathData;
}

/**
 * Create SVG shape objects dynamically
 *
 * Constructor function that creates an object representing an SVG shape.
 * Automatically detects the shape type based on provided properties.
 *
 * Shape types detected:
 * - path: has 'd' property
 * - line: has x1, y1, x2, y2
 * - circle: has cx, cy, r
 * - ellipse: has cx, cy, rx, ry (where rx !== ry)
 * - rect: has width, height
 * - polygon/polyline: has points array
 *
 * Usage: new svgEl({cx: 50, cy: 50, r: 20}) creates a circle
 *
 * @param props - Object with SVG shape properties
 * @returns SVG shape instance with type detection
 */
function svgEl(props) {
    let usedProps = Object.keys(props);

    // Copy all properties to this object
    for (prop in props) {
        this[prop] = props[prop];
    }

    // Detect shape type from properties
    if (usedProps.includes('d')) {
        this.type = 'path';
    } else if (usedProps.includes('x2') && usedProps.includes('y2')) {
        this.type = 'line';
    } else if (usedProps.includes('points')) {
        // Normalize points to array format
        let pts = Array.isArray(props.points)
            ? props.points
            : props.points.split(/[,| ]/).map(Number);
        this.points = pts;

        // Heuristic: if x-coordinates are monotonic, likely a polyline graph
        let xArr = pts.filter((val, i) => {
            return i % 2 === 0; // Every other value is an x-coordinate
        });
        let xmin = Math.min(...xArr);
        let xmax = Math.max(...xArr);
        let isPolyline = xArr[0] === xmin && xArr[xArr.length - 1] === xmax ? true : false;
        this.type = props.type !== 'polyline' ? (isPolyline ? 'polyline' : 'polygon') : 'polyline';
    } else if (usedProps.includes('cx') && usedProps.includes('cy') && usedProps.includes('r')) {
        this.type = 'circle';
    } else if (
        usedProps.includes('cx') &&
        usedProps.includes('cy') &&
        usedProps.includes('rx') &&
        usedProps.includes('ry')
    ) {
        // Ellipse with equal radii is a circle
        if (props.rx === props.ry) {
            this.type = 'circle';
        } else {
            this.type = 'ellipse';
        }
    } else if (usedProps.includes('width') && usedProps.includes('height')) {
        this.type = 'rect';
    }
}

/**
 * Convert path data array to SVG path string
 *
 * Converts normalized PathData array back to SVG 'd' attribute string format.
 * Each command is formatted as: "COMMAND_TYPE value1 value2 ..."
 *
 * Example: [{type: 'M', values: [10, 20]}, {type: 'L', values: [30, 40]}]
 *       -> "M 10 20 L 30 40"
 *
 * Usage: pathDataArray.toPathDataString()
 *
 * @returns SVG path 'd' attribute string
 */
Array.prototype.toPathDataString = function () {
    let d = this.map((com) => {
        return `${com.type} ${com.values.join(' ')}`;
    }).join(' ');
    return d;
};

/**
 * retrieve pathdata from shape object
 * e.g circle: svgEl({cx:50, cy:50, r:20}).toPathData()
 */
svgEl.prototype.toPathData = function (keepArcs = false) {
    let pathData = [];
    let {type} = this;
    // cubic arc approximation
    let kappa = 0.551784777779014;
    let kappa_x = 1 - kappa;

    switch (type) {
        case 'path':
            let d = this.d;
            // parse and normalize
            let options = {
                toAbsolute: true,
                arcsToCubic: true,
                arcAccuracy: 1,
            };
            pathData = Array.isArray(d) ? d : parsePathDataNormalized(d, options);
            break;

        case 'polygon':
        case 'polyline':
            let points = this.points;
            pathData = [{type: 'M', values: [points[0], points[1]]}];
            for (let i = 3; i < points.length; i += 2) {
                pathData.push({type: 'L', values: [points[i - 1], points[i]]});
            }
            if (type === 'polygon') {
                pathData.push({type: 'Z', values: []});
            }
            break;

        case 'rect':
            x = this.x ? this.x : 0;
            y = this.y ? this.y : 0;
            width = this.width;
            height = this.height;
            rx = this.rx;
            ry = this.ry;

            if (!rx && !ry) {
                pathData = [
                    {type: 'M', values: [x, y]},
                    {type: 'L', values: [x + width, y]},
                    {type: 'L', values: [x + width, y + height]},
                    {type: 'L', values: [x, y + height]},
                    {type: 'Z', values: []},
                ];
            } else {
                if (rx > width / 2) {
                    rx = width / 2;
                }
                if (ry > height / 2) {
                    ry = height / 2;
                }

                if (!keepArcs) {
                    pathData = [
                        {type: 'M', values: [x + rx, y]},
                        {type: 'L', values: [x + width - rx, y]},
                        {
                            type: 'C',
                            values: [
                                x + width - rx * kappa_x,
                                y,
                                x + width,
                                y + ry * kappa,
                                x + width,
                                y + ry,
                            ],
                        },
                        {type: 'L', values: [x + width, y + height - ry]},
                        {
                            type: 'C',
                            values: [
                                x + width,
                                y + height - ry * kappa,
                                x + width - rx * kappa_x,
                                y + height,
                                x + width - rx,
                                y + height,
                            ],
                        },

                        {type: 'L', values: [x + rx, y + height]},
                        {
                            type: 'C',
                            values: [
                                x + rx * kappa_x,
                                y + height,
                                x,
                                y + height - ry * kappa,
                                x,
                                y + height - ry,
                            ],
                        },
                        {type: 'L', values: [x, y + ry]},
                        {
                            type: 'C',
                            values: [x, y + ry * kappa, x + rx * kappa_x, y, x + rx, y],
                        },
                        {type: 'Z', values: []},
                    ];
                } else {
                    pathData = [
                        {type: 'M', values: [x + rx, y]},
                        {type: 'H', values: [x + width - rx]},
                        {type: 'A', values: [rx, ry, 0, 0, 1, x + width, y + ry]},
                        {type: 'V', values: [y + height - ry]},
                        {type: 'A', values: [rx, ry, 0, 0, 1, x + width - rx, y + height]},
                        {type: 'H', values: [x + rx]},
                        {type: 'A', values: [rx, ry, 0, 0, 1, x, y + height - ry]},
                        {type: 'V', values: [y + ry]},
                        {type: 'A', values: [rx, ry, 0, 0, 1, x + rx, y]},
                        {type: 'Z', values: []},
                    ];
                }
            }
            break;

        case 'circle':
        case 'ellipse':
            cx = this.cx;
            cy = this.cy;
            if (type === 'circle') {
                r = this.r;
            }
            rx = this.rx ? this.rx : r;
            ry = this.ry ? this.ry : r;

            if (!keepArcs) {
                pathData = [
                    {type: 'M', values: [cx + rx, cy]},

                    {
                        type: 'C',
                        values: [cx + rx, cy + ry * kappa, cx + rx * kappa, cy + ry, cx, cy + ry],
                    },

                    {
                        type: 'C',
                        values: [cx - rx * kappa, cy + ry, cx - rx, cy + ry * kappa, cx - rx, cy],
                    },

                    {
                        type: 'C',
                        values: [cx - rx, cy - ry * kappa, cx - rx * kappa, cy - ry, cx, cy - ry],
                    },

                    {
                        type: 'C',
                        values: [cx + rx * kappa, cy - ry, cx + rx, cy - ry * kappa, cx + rx, cy],
                    },
                ];
            } else {
                pathData = [
                    {type: 'M', values: [cx + rx, cy]},
                    {type: 'A', values: [rx, ry, 0, 1, 1, cx - rx, cy]},
                    {type: 'A', values: [rx, ry, 0, 1, 1, cx + rx, cy]},
                ];
            }
            break;
    }

    return pathData;
};

Array.prototype.getIntersections = function (
    stopAtFirst = false,
    quality = 'medium',
    decimals = 8,
) {
    let el1 = this[0];
    let el2 = this[1];
    let inter = [];

    // is circle
    if (el1.type === 'circle' && el2.type === 'circle') {
        inter = findCircleIntersection(el1, el2);
        console.log('circle', inter);
    } else {
        let pathData1 = new svgEl(JSON.parse(JSON.stringify(el1))).toPathData();
        let pathData2 = new svgEl(JSON.parse(JSON.stringify(el2))).toPathData();

        inter = findPathIntersections(pathData1, pathData2, stopAtFirst, quality);
        if (inter.length) {
            inter = inter.map((it) => {
                return {x: +it.x.toFixed(decimals), y: +it.y.toFixed(decimals)};
            });
        }
    }

    return inter;
};

/**
 * Find intersection points between two circles
 *
 * Calculates the precise intersection points of two circles using
 * analytical geometry. Handles various cases:
 * - Two intersection points (circles partially overlap)
 * - One intersection point (circles are tangent)
 * - No intersection (circles don't touch or one is inside the other)
 * - Infinite intersections (circles are identical)
 *
 * Based on:
 * https://stackoverflow.com/questions/12219802/a-javascript-function-that-returns-the-x-y-points-of-intersection-between-two-ci
 *
 * @param c1 - First circle {cx, cy, r}
 * @param c2 - Second circle {cx, cy, r}
 * @param decimals - Precision for rounding coordinates
 * @returns Array of intersection points (0, 1, or 2 points)
 */
function findCircleIntersection(c1, c2, decimals = 8) {
    let result = {
        intersect_count: 0,
        intersect_occurs: false,
        one_is_in_other: false,
        are_equal: false,
        points: [],
    };

    // Calculate distance between circle centers
    const dx = c2.cx - c1.cx;
    const dy = c2.cy - c1.cy;
    const dist = Math.hypot(dy, dx);

    // Check if circles are the same.
    if (c1.cx === c2.cx && c1.cy === c2.cy && c1.r === c2.r) {
        result.are_equal = true;
        return [];
    }

    // Check one circle isn't inside the other.
    let rDiff = Math.abs(c1.r - c2.r);
    if (dist <= rDiff) {
        result.one_is_in_other = true;
        if (dist < rDiff) return [];
    }

    // Check if circles intersect.
    if (dist <= c1.r + c2.r) {
        result.intersect_occurs = true;
    }

    // Find the intersection points
    if (result.intersect_occurs) {
        // Centroid is the pt where two lines cross. A line between the circle centers
        // and a line between the intersection points.
        const centroid = (c1.r * c1.r - c2.r * c2.r + dist * dist) / (2 * dist);

        // Get the coordinates of centroid.
        const x2 = c1.cx + (dx * centroid) / dist;
        const y2 = c1.cy + (dy * centroid) / dist;

        // Get the distance from centroid to the intersection points.
        const h = Math.sqrt(c1.r * c1.r - centroid * centroid);

        // Get the x and y dist of the intersection points from centroid.
        const rx = -dy * (h / dist);
        const ry = dx * (h / dist);

        let pt1 = {
            x: +(x2 + rx).toFixed(decimals),
            y: +(y2 + ry).toFixed(decimals),
        };
        let pt2 = {
            x: +(x2 - rx).toFixed(decimals),
            y: +(y2 - ry).toFixed(decimals),
        };

        // Add intersection count to results
        if (pt1.x === pt2.x && pt1.y === pt2.y) {
            result.intersect_count = 1;
            result.points.push(pt1);
        } else {
            result.intersect_count = 2;
            result.points.push(pt1, pt2);
        }
    }
    //return result;
    return result.points;
}

/**
 * Find intersection point between two line segments
 *
 * Uses the parametric line intersection algorithm.
 * Line 1: P = p1 + t(p2 - p1) where 0 ≤ t ≤ 1
 * Line 2: Q = p3 + s(p4 - p3) where 0 ≤ s ≤ 1
 *
 * Returns intersection point only if it lies on both line segments
 * (not just on the infinite lines they define).
 *
 * @param p1, p2 - Endpoints of first line segment
 * @param p3, p4 - Endpoints of second line segment
 * @returns Intersection point {x, y, t} or false if no intersection
 *          t is the parametric position on line 2
 */
function intersectLines(p1, p2, p3, p4) {
    /**
     * Check if a point lies on a line segment within tolerance
     */
    const isOnLine = (x1, y1, x2, y2, px, py, tolerance = 0.001) => {
        var f = function (somex) {
            return ((y2 - y1) / (x2 - x1)) * (somex - x1) + y1;
        };
        return Math.abs(f(px) - py) < tolerance && px >= x1 && px <= x2;
    };

    // Fast rejection: check if bounding boxes don't overlap
    if (
        Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) ||
        Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) ||
        Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) ||
        Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y)
    ) {
        return false;
    }

    // Calculate denominator for parametric equations
    let denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    // Denominator is 0 if lines are parallel
    if (denominator == 0) {
        return false;
    }

    // Solve for parametric positions
    let a = p1.y - p3.y;
    let b = p1.x - p3.x;
    let numerator1 = (p4.x - p3.x) * a - (p4.y - p3.y) * b;
    let numerator2 = (p2.x - p1.x) * a - (p2.y - p1.y) * b;
    a = numerator1 / denominator; // Parameter t on line 1
    b = numerator2 / denominator; // Parameter s on line 2

    // Calculate intersection point
    let px = p1.x + a * (p2.x - p1.x),
        py = p1.y + a * (p2.y - p1.y);

    let px2 = +px.toFixed(2),
        py2 = +py.toFixed(2);

    // Verify intersection point is within both line segment bounds
    if (
        px2 < +Math.min(p1.x, p2.x).toFixed(2) ||
        px2 > +Math.max(p1.x, p2.x).toFixed(2) ||
        px2 < +Math.min(p3.x, p4.x).toFixed(2) ||
        px2 > +Math.max(p3.x, p4.x).toFixed(2) ||
        py2 < +Math.min(p1.y, p2.y).toFixed(2) ||
        py2 > +Math.max(p1.y, p2.y).toFixed(2) ||
        py2 < +Math.min(p3.y, p4.y).toFixed(2) ||
        py2 > +Math.max(p3.y, p4.y).toFixed(2)
    ) {
        // Edge case: check if endpoint of one segment lies on the other segment
        if (isOnLine(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y, 0.1)) {
            return {x: p2.x, y: p2.y};
        }
        return false;
    }
    return {x: px, y: py, t: b};
}

/**
 * Test if two bounding boxes overlap
 *
 * Fast intersection test used to quickly eliminate non-overlapping
 * paths before more expensive segment-by-segment checks.
 *
 * @param bbox1 - First bounding box {x, y, right, bottom}
 * @param bbox2 - Second bounding box {x, y, right, bottom}
 * @returns True if boxes overlap, false otherwise
 */
function isBBoxIntersect(bbox1, bbox2) {
    let {x, y, right, bottom} = bbox1;
    let [x2, y2, right2, bottom2] = [bbox2.x, bbox2.y, bbox2.right, bbox2.bottom];

    let bboxIntersection =
        x <= right2 && y <= bottom2 && bottom >= y2 && right >= x2 ? true : false;

    return bboxIntersection;
}

/**
 * Calculate bounding box for a set of points
 *
 * @param points - Array of points {x, y}
 * @returns Bounding box {x, y, width, height, right, bottom}
 */
function commandBBox(points) {
    let allX = points.map((pt) => {
        return pt.x;
    });
    let allY = points.map((pt) => {
        return pt.y;
    });

    let minX = Math.min(...allX);
    let maxX = Math.max(...allX);
    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);

    let bb = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        right: maxX,
        bottom: maxY,
    };
    return bb;
}

/**
 * Find intersections between two polylines or polygons
 *
 * Brute-force approach: tests every segment from first shape
 * against every segment from second shape.
 *
 * @param el1 - First shape (line, polyline, or polygon)
 * @param el2 - Second shape (line, polyline, or polygon)
 * @returns Array of intersection points
 */
function getPolyIntersections(el1, el2) {
    /**
     * Convert flat coordinate array to array of point objects
     * [x1, y1, x2, y2, ...] -> [{x: x1, y: y1}, {x: x2, y: y2}, ...]
     */
    function arrayToPoints(pts) {
        let ptsN = [];
        for (let i = 1; i < pts.length; i += 2) {
            ptsN.push({x: pts[i - 1], y: pts[i]});
        }
        return ptsN;
    }

    // Extract points from first shape
    let pts1 = el1.type === 'line' ? [el1.x1, el1.y1, el1.x2, el1.y2] : el1.points;
    pts1 = arrayToPoints(pts1);

    // Close polygon by adding first point at end
    if (el1.type === 'polygon') pts1.push(pts1[0]);

    // Extract points from second shape
    let pts2 = el2.type === 'line' ? [el2.x1, el2.y1, el2.x2, el2.y2] : el2.points;
    pts2 = arrayToPoints(pts2);
    if (el2.type === 'polygon') pts2.push(pts2[0]);

    // Test all segment pairs for intersection
    let intersections = [];
    for (let i = 0; i < pts1.length - 1; i++) {
        let l1 = pts1[i];
        let l1_1 = pts1[i + 1] ? pts1[i + 1] : l1;

        for (let j = 0; j < pts2.length - 1; j++) {
            let l2 = pts2[j];
            let l2_1 = pts2[j + 1] ? pts2[j + 1] : l2;

            let intersection = intersectLines(l1, l1_1, l2, l2_1);
            if (intersection) {
                intersections.push(intersection);
            }
        }
    }
    return intersections;
}

export {
    findPathIntersections,
    getElementIntersections,
    checkCollision,
    findPathDataIntersections,
    svgEl,
    findCircleIntersection,
    pointAtT,
    parsePathDataNormalized,
};
