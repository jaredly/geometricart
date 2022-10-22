declare module 'pathkit-wasm' {
    export type SkRect = {
        fLeft: number;
        fTop: number;
        fRight: number;
        fBottom: number;
    };

    export type Path = {
        moveTo(x: number, y: number): Path;
        lineTo(x: number, y: number): Path;
        close(): Path;
        copy(): Path;
        closePath(): Path;
        /**
         * Returns an `SkRect` that represents the minimum and maximum area of `this` path.
         * See
         * [SkPath reference](https://api.skia.org/classSkPath.html#a597c8fcc5e4750542e2688b057a14e9e)
         * for more details.
         */
        computeTightBounds(): SkRect;
        stroke(config: {
            width?: number;
            join?: Join;
            cap?: Cap;
            miter_limit?: number;
        }): Path;
        op(path: Path, op: PathOp): Path;

        addPath(other: Path, transform?: SVGMatrix): Path;
        addPath(
            other: Path,
            a: number,
            b: number,
            c: number,
            d: number,
            e: number,
            f: number,
        ): Path;
        addPath(
            other: Path,
            scaleX: number,
            skewX: number,
            transX: number,
            skewY: number,
            scaleY: number,
            transY: number,
            pers0: number,
            pers1: number,
            pers2: number,
        ): Path;

        transform(matrix: SVGMatrix): Path;
        transform(
            scaleX: number,
            skewX: number,
            transX: number,
            skewY: number,
            scaleY: number,
            transY: number,
            pers0: number,
            pers1: number,
            pers2: number,
        ): Path;

        /**
         * **x, y** - `Number`, The coordinates of the arc's center. <br> **radius** -
         * `Number`, The radius of the arc. <br> **startAngle, endAngle** - `Number`, the
         * start and end of the angle, measured clockwise from the positive x axis and in
         * radians. <br> **ccw** - `Boolean`, optional argument specifying if the arc
         * should be drawn counter-clockwise between **startAngle** and **endAngle**
         * instead of clockwise, the default.
         *
         * Adds the described arc to `this` then returns `this` for chaining purposes. See
         * [Path2D.arc()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc)
         * for more details.
         */
        arc(
            x: number,
            y: number,
            radius: number,
            startAngle: number,
            endAngle: number,
            ccw: boolean,
        ): Path;
        /**
         * **x1, y1, x2, y2** - `Number`, The coordinates defining the control points. <br>
         * **radius** - `Number`, The radius of the arc.
         *
         * Adds the described arc to `this` (appending a line, if needed) then returns
         * `this` for chaining purposes. See
         * [Path2D.arcTo()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arcTo)
         * for more details.
         */
        arcTo(
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            radius: number,
        ): Path;

        delete(): void;

        ellipse(
            x: number,
            y: number,
            radiusX: number,
            radiusY: number,
            rotation: number,
            startAngle: number,
            endAngle: number,
            ccw: boolean,
        ): Path;

        dash(on: number, off: number, phase: number): Path;

        getFillType(): FillType;
        getFillTypeString(): CanvasFillRule;
        toPath2D(): Path2D;
        toSVGString(): string;
        toCmds(): Array<Array<number>>;
        toCanvas(ctx: CanvasRenderingContext2D): void;
        simplify(): Path;
        setFillType(fillType: FillType);
        rect(x: number, y: number, w: number, h: number): Path;
        quadTo(cpx: number, cpy: number, x: number, y: number): Path;
        quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): Path;
        getBounds(): SkRect;
        equals(path: Path): boolean;
    };

    enum Join {
        MITER,
        ROUND,
        BEVEL,
    }
    enum Cap {
        BUTT,
        ROUND,
        SQUARE,
    }
    enum FillType {
        WINDING,
        EVENODD,
        INVERSE_WINDING,
        INVERSE_EVENODD,
    }
    enum PathOp {
        DIFFERENCE,
        REVERSE_DIFFERENCE,
        INTERSECT,
        UNION,
        XOR,
    }

    export type PathKit = {
        StrokeJoin: { [key in keyof typeof Join]: Join };
        StrokeCap: { [key in keyof typeof Cap]: Cap };
        PathOp: { [key in keyof typeof PathOp]: PathOp };
        FillType: { [key in keyof typeof FillType]: FillType };
        /** Returns an empty `SkPath` object.  */
        NewPath(pathToCopy?: Path): Path;

        FromSVGString(str: string): Path;
        /**
         * **cmds** - `Array<Array<Number>>`, a 2D array of commands, where a command is a
         * verb followed by its arguments.
         *
         * Returns an `SkPath` with the verbs and arguments from the list or `null` on a
         * failure.
         *
         * This can be faster than calling `.moveTo()`, `.lineTo()`, etc many times.
         *
         * Example:
         *
         *     let cmds = [
         *         [PathKit.MOVE_VERB, 0, 10],
         *         [PathKit.LINE_VERB, 30, 40],
         *         [PathKit.QUAD_VERB, 20, 50, 45, 60],
         *     ];
         *     let path = PathKit.FromCmds(cmds);
         *     // path is the same as if a user had done
         *     // let path = PathKit.NewPath().moveTo(0, 10).lineTo(30, 40).quadTo(20, 50, 45, 60);
         *     // don't forget to do path.delete() when it goes out of scope.
         */
        FromCmds(cmds: Array<Array<number>>): Path;
        MakeFromOp(one: Path, two: Path, op: PathOp): Path;

        cubicYFromX(
            cpx1: number,
            cpy1: number,
            cpx2: number,
            cpy2: number,
            x: number,
        ): number;
        cubicPtFromT(
            cpx1: number,
            cpy1: number,
            cpx2: number,
            cpy2: number,
            t: number,
        ): [number, number];

        MOVE_VERB: number;
        LINE_VERB: number;
        QUAD_VERB: number;
        CONIC_VERB: number;
        CUBIC_VERB: number;
        CLOSE_VERB: number;
    };

    type Config = { locateFile: (file: string) => string };
    function PathKitInit(config: Config): Promise<PathKit>;
    export default PathKitInit;
}
