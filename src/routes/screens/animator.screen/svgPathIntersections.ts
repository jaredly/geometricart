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
 * check if paths are intersecting
 * stop at first intersection to optimize performance
 * handy for collision tests
 * */
function checkCollision(d1: PathData, d2: PathData) {
    // parse and normalize
    let options = {
        toAbsolute: true,
        arcsToCubic: true,
        arcAccuracy: 1,
    };
    // parse path data
    let pathData1 = Array.isArray(d1) ? d1 : parsePathDataNormalized(d1, options);
    let pathData2 = Array.isArray(d1) ? d2 : parsePathDataNormalized(d2, options);

    return findPathDataIntersections(pathData1, pathData2, true, 'low').length;
}

//  intersection from parsed path data
function findPathDataIntersections(
    pathData1: PathData,
    pathData2: PathData,
    stopAtFirst = true,
    quality: Quality = 'medium',
) {
    /**
     * helpers
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
        for (let i = 0; i < data1.splits && !quit; i++) {
            for (let j = 0; j < data2.splits && !quit; j++) {
                let l1 = data1.dots[i],
                    l1_1 = data1.dots[i + 1],
                    l2 = data2.dots[j],
                    l2_1 = data2.dots[j + 1],
                    ci = Math.abs(l1_1.x - l1.x) < 0.01 ? 'y' : 'x',
                    cj = Math.abs(l2_1.x - l2.x) < 0.01 ? 'y' : 'x';

                let intersection = intersectLines(l1, l1_1, l2, l2_1);
                scan++;

                if (intersection) {
                    if (stopAtFirst && intersections) {
                        quit = true;
                    }

                    let intersection_key =
                        intersection.x.toFixed(1) + '_' + intersection.y.toFixed(1);

                    //if coorl1nates already found: skip
                    if (xy[intersection_key]) {
                        continue;
                    }
                    // save found intersection
                    xy[intersection_key] = true;

                    let t1 =
                            l1.t +
                            Math.abs((intersection[ci] - l1[ci]) / (l1_1[ci] - l1[ci])) *
                                (l1_1.t - l1.t),
                        t2 =
                            l2.t +
                            Math.abs((intersection[cj] - l2[cj]) / (l2_1[cj] - l2[cj])) *
                                (l2_1.t - l2.t);

                    if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
                        intersections.push({
                            x: intersection.x,
                            y: intersection.y,
                            t1: t1,
                            t2: t2,
                        });

                        // quit if max  intersections were reached
                        if (intersections.length >= maxInter) {
                            //console.log('max intersections found', scan, intersections.length);
                            quit = true;
                        }
                    }
                }
            }
        }
        return intersections;
    };

    const lineLength = (p0: Point, p1: Point) => {
        return Math.sqrt((p1.x - p0.x) * (p1.x - p0.x) + (p1.y - p0.y) * (p1.y - p0.y));
    };

    const getPathDataBBox = (pathData: PathData) => {
        // get segment bboxes
        let allX = [];
        let allY = [];
        for (let i = 1; i < pathData.length; i++) {
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let p0 = {x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1]};

            let com = pathData[i];
            let {type, values} = com;
            let valuesL = values.length;
            let p = {x: values[valuesL - 2], y: values[valuesL - 1]};
            let cp1, cp2, length, commandBBox;

            let M = pathData[0].values;
            cp1 = valuesL ? {x: values[0], y: values[1]} : M;
            cp2 = type === 'C' ? {x: values[valuesL - 4], y: values[valuesL - 3]} : cp1;

            // get approximated path bbox
            if (valuesL) {
                allX.push(p0.x, cp1.x, cp2.x, p.x);
                allY.push(p0.y, cp1.y, cp2.y, p.y);
            }
        }

        /**
         * total bounding box
         * (coarse approximation)
         * are two paths remotely intersecting at all
         */
        let minX = Math.min(...allX);
        let minY = Math.min(...allY);
        let maxX = Math.max(...allX);
        let maxY = Math.max(...allY);
        let bb = {x: minX, y: minY, right: maxX, bottom: maxY};

        return bb;
    };

    const isLine = (bez) => {
        return bez[0] === bez[2] && bez[1] === bez[3] && bez[4] === bez[6] && bez[5] === bez[7];
    };

    const getBezierLineIntersection = (points, line) => {
        /**
         * based on:
         * https://www.particleincell.com/2013/cubic-line-intersection/
         */
        const getIntersectionsCubic = (points, line) => {
            let [p0, cp1, cp2, p] = points;

            // adjust horizonzal or vertical start and end points
            let epsilon = 0.0001;
            p0.y = p0.y === p.y ? p0.y - epsilon : p0.y;
            p0.x = p0.x === p.x ? p0.x - epsilon : p0.x;

            const solveCubicRoots = (P) => {
                let [a, b, c, d] = P;
                var A = b / a,
                    B = c / a,
                    C = d / a,
                    Q = (3 * B - Math.pow(A, 2)) / 9,
                    R = (9 * A * B - 27 * C - 2 * Math.pow(A, 3)) / 54,
                    D = Math.pow(Q, 3) + Math.pow(R, 2),
                    Im;
                let t = [];
                if (D >= 0) {
                    // complex or duplicate roots
                    const S =
                        Math.sign(R + Math.sqrt(D)) * Math.pow(Math.abs(R + Math.sqrt(D)), 1 / 3);
                    const T =
                        Math.sign(R - Math.sqrt(D)) * Math.pow(Math.abs(R - Math.sqrt(D)), 1 / 3);
                    t = [
                        -A / 3 + (S + T), // real root
                        -A / 3 - (S + T) / 2, // real part of complex root
                        -A / 3 - (S + T) / 2, // real part of complex root
                    ];
                    // complex part of root pair
                    Im = Math.abs((Math.sqrt(3) * (S - T)) / 2);
                    // discard complex roots
                    if (Im !== 0) {
                        t[1] = -1;
                        t[2] = -1;
                    }
                } else {
                    // distinct real roots
                    let th = Math.acos(R / Math.sqrt(-Math.pow(Q, 3)));
                    t = [
                        2 * Math.sqrt(-Q) * Math.cos(th / 3) - A / 3,
                        2 * Math.sqrt(-Q) * Math.cos((th + 2 * Math.PI) / 3) - A / 3,
                        2 * Math.sqrt(-Q) * Math.cos((th + 4 * Math.PI) / 3) - A / 3,
                    ];
                    Im = 0.0;
                }
                // discard out of spec roots
                return t.filter((val) => {
                    return val >= 0 && val <= 1;
                });
            };

            const bezierCoefficients = (p0, p1, p2, p3) => {
                return [
                    -p0 + 3 * p1 + -3 * p2 + p3,
                    3 * p0 - 6 * p1 + 3 * p2,
                    -3 * p0 + 3 * p1,
                    p0,
                ];
            };

            let A = line[1].y - line[0].y;
            let B = line[0].x - line[1].x;
            let C = line[0].x * (line[0].y - line[1].y) + line[0].y * (line[1].x - line[0].x);

            const xBezierCoefficients = bezierCoefficients(p0.x, cp1.x, cp2.x, p.x);
            const yBezierCoefficients = bezierCoefficients(p0.y, cp1.y, cp2.y, p.y);
            const P = [
                A * xBezierCoefficients[0] + B * yBezierCoefficients[0],
                A * xBezierCoefficients[1] + B * yBezierCoefficients[1],
                A * xBezierCoefficients[2] + B * yBezierCoefficients[2],
                A * xBezierCoefficients[3] + B * yBezierCoefficients[3] + C,
            ];
            let cubicRoots = solveCubicRoots(P);

            let pts = [];
            cubicRoots.forEach((t) => {
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

                // calc t  for lineto
                let pt1 = {x: pt.x - 10, y: pt.y - 10};
                let pt2 = {x: pt.x + 10, y: pt.y + 10};
                let inter = intersectLines(pt1, pt2, line[0], line[1]);

                pts.push({
                    x: pt.x,
                    y: pt.y,
                    t1: inter.t,
                    t2: t,
                });
            });

            return pts;
        };

        /**
         * Based on
         * https://stackoverflow.com/questions/77003429/intersection-of-quadratic-bezier-path-and-line/77010181?noredirect=1#comment135763117_77010181
         */
        const getIntersectionsQuadratic = (points, line) => {
            const {atan2, cos, sin, sqrt} = Math;

            const getRoots = (pts, [[x1, y1], [x2, y2]]) => {
                // Transform and rotate our coordinates as per above,
                // noting that we only care about the y coordinate:
                const angle = atan2(y2 - y1, x2 - x1);
                const v = pts.map(([x, y]) => (x - x1) * sin(-angle) + (y - y1) * cos(-angle));
                // And now we're essentially done, we can trivially find our roots:
                return (
                    solveQuadratic(v[0], v[1], v[2])
                        // ...as long as those roots are in the Bezier interval [0,1] of course.
                        .filter((t) => 0 <= t && t <= 1)
                );
            };

            const solveQuadratic = (v1, v2, v3) => {
                const a = v1 - 2 * v2 + v3,
                    b = 2 * (v2 - v1),
                    c = v1;
                // quick check, is "a" zero? if so, the solution is linear.
                if (a === 0) return b === 0 ? [] : [-c / b];
                const u = -b / (2 * a),
                    v = b ** 2 - 4 * a * c;
                if (v < 0) return []; // If there are no roots, there are no roots. Done.
                if (v === 0) return [u]; // If there's only one root, return that.
                // And if there are two roots we compute the "full" formula
                const w = sqrt(v) / (2 * a);
                return [u + w, u - w];
            };

            // flatten to coordinate array
            points = points.map((pt) => {
                return Object.values(pt);
            });
            let lineArr = line.map((pt) => {
                return Object.values(pt);
            });
            const [[x1, y1], [x2, y2], [x3, y3]] = points;
            const roots = getRoots(points, lineArr);

            const coordForRoot = (t, x2, x3, y2, y3) => {
                const mt = 1 - t;
                let pt = {
                    x: x1 * mt ** 2 + 2 * x2 * t * mt + x3 * t ** 2,
                    y: y1 * mt ** 2 + 2 * y2 * t * mt + y3 * t ** 2,
                };

                // calc t  for lineto
                let pt1 = {x: pt.x - 10, y: pt.y - 10};
                let pt2 = {x: pt.x + 10, y: pt.y + 10};
                let inter = intersectLines(pt1, pt2, line[0], line[1]);

                return {
                    x: pt.x,
                    y: pt.y,
                    t1: inter.t,
                    t2: t,
                };
            };

            const intersections = roots.map((t) => coordForRoot(t, x2, x3, y2, y3));
            return intersections;
        };

        let inter =
            points.length === 4
                ? getIntersectionsCubic(points, line)
                : getIntersectionsQuadratic(points, line);
        return inter;
    };

    // all results
    let res = [];

    //no path intersection at all - exit
    let bb1 = getPathDataBBox(pathData1);
    let bb2 = getPathDataBBox(pathData2);

    if (!isBBoxIntersect(bb1, bb2)) {
        return res;
    }

    // collect found intersections to exclude duplicates close points
    let xy = {};

    function getPathInfo(pathData) {
        let pathArr = [];
        let M = {x: pathData[0].values[0], y: pathData[0].values[1]};

        pathData.forEach((com, i) => {
            let cpts = [];
            let {type, values} = com;
            let obj = {
                type: type,
                cpts: [],
                selfintersects: false,
                len: 0,
                splits: 0,
                dots: [],
                bb: {},
            };

            let valuesL = values.length;
            let comPrev = i > 0 ? pathData[i - 1] : pathData[i];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;

            let p0 = {x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1]};
            let p = valuesL ? {x: values[valuesL - 2], y: values[valuesL - 1]} : M;
            let cp1 = valuesL ? {x: values[0], y: values[1]} : p0;
            let cp2 = valuesL > 2 ? {x: values[2], y: values[3]} : p;

            switch (type) {
                // new M
                case 'M':
                    M = {x: p.x, y: p.y};
                    cpts = [];
                    break;
                case 'C':
                    cpts = [p0, cp1, cp2, p];
                    obj.selfintersects = intersectLines(p0, cp1, cp2, p) !== false ? true : false;
                    break;

                case 'Q':
                    cpts = [p0, cp1, p];
                    break;

                // treat Z as lineto
                case 'Z':
                case 'z':
                    p = M;
                    cpts = [p0, p];
                    break;
                default:
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

    function addSegmentDots(obj, quality = 'medium') {
        let {cpts} = obj;
        let l = 240,
            sampleDist = 20,
            div = 16,
            minDiv = 16,
            maxDiv = 16;

        if (quality === 'medium' || quality === 'high') {
            // approximate length by polygon length
            let pM = pointAtT(cpts, 0.5);
            l = lineLength(cpts[0], pM) + lineLength(cpts[cpts.length - 1], pM);
            sampleDist = quality === 'medium' ? 10 : 5;
            div = Math.ceil(l / sampleDist);
            minDiv = quality === 'high' ? 48 : 24;
            maxDiv = quality === 'high' ? 1000 : 500;
        }

        // set minimum and maximum precision for short or long segments
        let splits =
            cpts.length === 2 || isLine(cpts)
                ? 1
                : (div > minDiv ? div : div > maxDiv ? maxDiv : minDiv) || 1;

        //console.log(sampleDist, maxDiv, splits);

        obj.len = l;
        obj.splits = splits;
        obj.bb = commandBBox(cpts);

        for (let i = 0; i < splits + 1; i++) {
            let t = i / splits;
            let pt = pointAtT(cpts, t);
            obj.dots.push({x: pt.x, y: pt.y, t: t});
        }
    }

    let pathInfo1 = getPathInfo(pathData1);
    let pathInfo2 = getPathInfo(pathData2);
    let quit = false;

    // check segment intersections
    for (let i = 0; i < pathData1.length && !quit; i++) {
        //measure paths
        let data1 = pathInfo1[i];

        if (!data1.cpts.length) {
            continue;
        }

        for (var j = 0; j < pathData2.length && !quit; j++) {
            let data2 = pathInfo2[j];
            if (!data2.cpts.length) {
                continue;
            }

            if (isBBoxIntersect(data1.bb, data2.bb)) {
                let type1 = data1.type,
                    type2 = data2.type;
                let maxInter =
                    type1 === 'C' && type2 === 'C' ? 4 : type1 === 'L' && type2 === 'L' ? 1 : 2;

                /**
                 * 1. line vs bezier
                 */
                let useBezCalc = true;
                if (
                    (type1 === 'L' || type2 === 'L') &&
                    (data1.cpts.length > 2 || data2.cpts.length > 2) &&
                    useBezCalc
                ) {
                    let line = type1 === 'L' ? data1 : data2;
                    let bez = type1 === 'L' ? data2 : data1;

                    let inter = getBezierLineIntersection(bez.cpts, line.cpts);
                    if (inter.length) {
                        inter.forEach((item) => {
                            let it = {
                                cpts1: line.cpts,
                                cpts2: bez.cpts,
                                segment1: i,
                                segment2: i,
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

                //self intersecting cubic
                if (maxInter === 4) {
                    if (!data1.selfintersects) {
                        maxInter--;
                    }
                    if (!data2.selfintersects) {
                        maxInter--;
                    }
                }

                // segment intersection - calculate sample points
                if (!data1.dots.length) {
                    addSegmentDots(data1, quality);
                }
                if (!data2.dots.length) {
                    addSegmentDots(data2, quality);
                }

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

function pointAtT(pts, t = 0.5) {
    /**
     * Linear  interpolation (LERP) helper
     */
    const interpolate = (p0, p, t) => {
        return {
            x: (p.x - p0.x) * t + p0.x,
            y: (p.y - p0.y) * t + p0.y,
        };
    };

    /**
     * calculate single points on segments
     */
    const getPointAtCubicSegmentT = (p0, cp1, cp2, p, t) => {
        let t1 = 1 - t;
        return {
            x: t1 ** 3 * p0.x + 3 * t1 ** 2 * t * cp1.x + 3 * t1 * t ** 2 * cp2.x + t ** 3 * p.x,
            y: t1 ** 3 * p0.y + 3 * t1 ** 2 * t * cp1.y + 3 * t1 * t ** 2 * cp2.y + t ** 3 * p.y,
        };
    };

    const getPointAtQuadraticSegmentT = (p0, cp1, p, t) => {
        let t1 = 1 - t;
        return {
            x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
            y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
        };
    };

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
 * parse pathData from d attribute
 * the core function to parse the pathData array from a d string
 **/

function parsePathDataNormalized(d, options = {}) {
    /**
     * convert arctocommands to cubic bezier
     * based on puzrin's a2c.js
     * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
     * returns pathData array
     */

    const arcToBezier = (p0, values, splitSegments = 1) => {
        let {abs, PI, sin, acos, cos, sqrt} = Math;
        const TAU = PI * 2;
        let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

        if (rx === 0 || ry === 0) {
            return [];
        }

        let phi = rotation ? (rotation * TAU) / 360 : 0;
        let sinphi = phi ? sin(phi) : 0;
        let cosphi = phi ? cos(phi) : 1;
        let pxp = (cosphi * (p0.x - x)) / 2 + (sinphi * (p0.y - y)) / 2;
        let pyp = (-sinphi * (p0.x - x)) / 2 + (cosphi * (p0.y - y)) / 2;

        if (pxp === 0 && pyp === 0) {
            return [];
        }
        rx = abs(rx);
        ry = abs(ry);
        let lambda = (pxp * pxp) / (rx * rx) + (pyp * pyp) / (ry * ry);
        if (lambda > 1) {
            let lambdaRt = sqrt(lambda);
            rx *= lambdaRt;
            ry *= lambdaRt;
        }

        /**
         * parametrize arc to
         * get center point start and end angles
         */
        let rxsq = rx * rx,
            rysq = rx === ry ? rxsq : ry * ry;

        let pxpsq = pxp * pxp,
            pypsq = pyp * pyp;
        let radicant = rxsq * rysq - rxsq * pypsq - rysq * pxpsq;

        if (radicant <= 0) {
            radicant = 0;
        } else {
            radicant /= rxsq * pypsq + rysq * pxpsq;
            radicant = sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
        }

        let centerxp = radicant ? ((radicant * rx) / ry) * pyp : 0;
        let centeryp = radicant ? ((radicant * -ry) / rx) * pxp : 0;
        let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2;
        let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2;

        let vx1 = (pxp - centerxp) / rx;
        let vy1 = (pyp - centeryp) / ry;
        let vx2 = (-pxp - centerxp) / rx;
        let vy2 = (-pyp - centeryp) / ry;

        // get start and end angle
        const vectorAngle = (ux, uy, vx, vy) => {
            let dot = +(ux * vx + uy * vy).toFixed(9);
            if (dot === 1 || dot === -1) {
                return dot === 1 ? 0 : PI;
            }
            dot = dot > 1 ? 1 : dot < -1 ? -1 : dot;
            let sign = ux * vy - uy * vx < 0 ? -1 : 1;
            return sign * acos(dot);
        };

        let ang1 = vectorAngle(1, 0, vx1, vy1),
            ang2 = vectorAngle(vx1, vy1, vx2, vy2);

        if (sweepFlag === 0 && ang2 > 0) {
            ang2 -= PI * 2;
        } else if (sweepFlag === 1 && ang2 < 0) {
            ang2 += PI * 2;
        }

        let ratio = +(abs(ang2) / (TAU / 4)).toFixed(0);

        // increase segments for more accureate length calculations
        let segments = ratio * splitSegments;
        ang2 /= segments;
        let pathDataArc = [];

        // If 90 degree circular arc, use a constant
        // https://pomax.github.io/bezierinfo/#circles_cubic
        // k=0.551784777779014
        const angle90 = 1.5707963267948966;
        const k = 0.551785;
        let a = ang2 === angle90 ? k : ang2 === -angle90 ? -k : (4 / 3) * tan(ang2 / 4);

        let cos2 = ang2 ? cos(ang2) : 1;
        let sin2 = ang2 ? sin(ang2) : 0;
        let type = 'C';

        const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
            let x1 = ang1 != ang2 ? cos(ang1) : cos2;
            let y1 = ang1 != ang2 ? sin(ang1) : sin2;
            let x2 = cos(ang1 + ang2);
            let y2 = sin(ang1 + ang2);

            return [
                {x: x1 - y1 * a, y: y1 + x1 * a},
                {x: x2 + y2 * a, y: y2 - x2 * a},
                {x: x2, y: y2},
            ];
        };

        for (let i = 0; i < segments; i++) {
            let com = {type: type, values: []};
            let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

            curve.forEach((pt) => {
                let x = pt.x * rx;
                let y = pt.y * ry;
                com.values.push(
                    cosphi * x - sinphi * y + centerx,
                    sinphi * x + cosphi * y + centery,
                );
            });
            pathDataArc.push(com);
            ang1 += ang2;
        }

        return pathDataArc;
    };

    d = d
        // remove new lines, tabs an comma with whitespace
        .replace(/[\n\r\t|,]/g, ' ')
        // pre trim left and right whitespace
        .trim()
        // add space before minus sign
        .replace(/(\d)-/g, '$1 -')
        // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
        .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, '$1$3 ');

    let pathData = [];
    let cmdRegEx = /([mlcqazvhst])([^mlcqazvhst]*)/gi;
    let commands = d.match(cmdRegEx);

    // valid command value lengths
    let comLengths = {m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0};

    options = {
        ...{
            toAbsolute: true,
            toLonghands: true,
            arcToCubic: true,
            arcAccuracy: 1,
        },
        ...options,
    };

    let {toAbsolute, toLonghands, arcToCubic, arcAccuracy} = options;
    let hasArcs = /[a]/gi.test(d);
    let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
    let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;

    // offsets for absolute conversion
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
 * Create svg shapes dynamically
 * e.g circle: svgEl({cx:50, cy:50, r:20})
 */
function svgEl(props) {
    let usedProps = Object.keys(props);

    for (prop in props) {
        this[prop] = props[prop];
    }

    // check types
    if (usedProps.includes('d')) {
        this.type = 'path';
    } else if (usedProps.includes('x2') && usedProps.includes('y2')) {
        this.type = 'line';
    } else if (usedProps.includes('points')) {
        // sanitize
        let pts = Array.isArray(props.points)
            ? props.points
            : props.points.split(/[,| ]/).map(Number);
        this.points = pts;

        //if first point equals xmin we likely have a polyline grapgh
        let xArr = pts.filter((val, i) => {
            return i % 2 === 0;
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
 *  stringify path data
 *  * e.g circle: svgEl({cx:50, cy:50, r:20}).toPathData().toPathDataString()
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
 * based on: https://stackoverflow.com/questions/12219802/a-javascript-function-that-returns-the-x-y-points-of-intersection-between-two-ci
 */

function findCircleIntersection(c1, c2, decimals = 8) {
    // Start constructing the response object.
    let result = {
        intersect_count: 0,
        intersect_occurs: false,
        one_is_in_other: false,
        are_equal: false,
        points: [],
    };

    // Get vertical and horizontal distances between circles.
    const dx = c2.cx - c1.cx;
    const dy = c2.cy - c1.cy;

    // Calculate the distance between the circle centers as a straight line.
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

function intersectLines(p1, p2, p3, p4) {
    const isOnLine = (x1, y1, x2, y2, px, py, tolerance = 0.001) => {
        var f = function (somex) {
            return ((y2 - y1) / (x2 - x1)) * (somex - x1) + y1;
        };
        return Math.abs(f(px) - py) < tolerance && px >= x1 && px <= x2;
    };

    /*
        // flat lines?
        let is_flat1 = p1.y === p2.y || p1.x === p2.x
        let is_flat2 = p3.y === p4.y || p1.y === p2.y
        console.log('flat', is_flat1, is_flat2);
        */

    if (
        Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) ||
        Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) ||
        Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) ||
        Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y)
    ) {
        return false;
    }

    let denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (denominator == 0) {
        return false;
    }

    let a = p1.y - p3.y;
    let b = p1.x - p3.x;
    let numerator1 = (p4.x - p3.x) * a - (p4.y - p3.y) * b;
    let numerator2 = (p2.x - p1.x) * a - (p2.y - p1.y) * b;
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    let px = p1.x + a * (p2.x - p1.x),
        py = p1.y + a * (p2.y - p1.y);

    let px2 = +px.toFixed(2),
        py2 = +py.toFixed(2);

    // is point in boundaries/actually on line?
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
        // if final point is on line
        if (isOnLine(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y, 0.1)) {
            return {x: p2.x, y: p2.y};
        }
        return false;
    }
    return {x: px, y: py, t: b};
}

function isBBoxIntersect(bbox1, bbox2) {
    let {x, y, right, bottom} = bbox1;
    let [x2, y2, right2, bottom2] = [bbox2.x, bbox2.y, bbox2.right, bbox2.bottom];

    let bboxIntersection =
        x <= right2 && y <= bottom2 && bottom >= y2 && right >= x2 ? true : false;

    return bboxIntersection;
}

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
    //console.log(bb);
    return bb;
}

function getPolyIntersections(el1, el2) {
    function arrayToPoints(pts) {
        let ptsN = [];
        for (let i = 1; i < pts.length; i += 2) {
            ptsN.push({x: pts[i - 1], y: pts[i]});
        }
        return ptsN;
    }

    let pts1 = el1.type === 'line' ? [el1.x1, el1.y1, el1.x2, el1.y2] : el1.points;
    pts1 = arrayToPoints(pts1);

    // close to start
    if (el1.type === 'polygon') pts1.push(pts1[0]);

    let pts2 = el2.type === 'line' ? [el2.x1, el2.y1, el2.x2, el2.y2] : el2.points;
    pts2 = arrayToPoints(pts2);
    if (el2.type === 'polygon') pts2.push(pts2[0]);

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
