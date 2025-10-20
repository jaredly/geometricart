import { useLoaderData, useParams } from "react-router";
import { ShowTiling } from "./ShowTiling";
import type { Route } from "./+types/pattern";
import { getPattern } from "./db.server";
import { useMemo } from "react";
import {
	canonicalShape,
	getPatternData,
	humanReadableFraction,
} from "./getPatternData";
import { findBoundingRect } from "../editor/Export";
import { addCoordToBounds, newPendingBounds } from "../editor/Bounds";
import { angleTo, applyMatrices } from "../rendering/getMirrorTransforms";
import { joinAdjacentShapeSegments } from "./shapesFromSegments";
import { closeEnoughAngle } from "../rendering/epsilonToZero";

export async function loader({ params }: Route.LoaderArgs) {
	if (!params.id) {
		return null;
	}
	return getPattern(params.id);
}

export const Pattern = () => {
	const { id } = useParams();
	const pattern = useLoaderData<typeof loader>();
	const data = useMemo(
		() => (pattern ? getPatternData(pattern.tiling) : null),
		[pattern],
	);
	if (!pattern || !data) {
		return <div>No data... {id}</div>;
	}

	const canonKeys: Record<
		string,
		ReturnType<typeof canonicalShape> & { percentage: number }
	> = {};
	data.canons.forEach((c) => {
		if (c.percentage) {
			if (!canonKeys[c.key]) {
				canonKeys[c.key] = { ...c };
			} else {
				canonKeys[c.key].percentage += c.percentage;
			}
		}
	});

	return (
		<div css={{ padding: 10 }}>
			Hello pattern {id}
			<div>
				<ShowTiling size={500} tiling={pattern.tiling} data={data} />
				<div style={{ display: "flex", flexWrap: "wrap" }}>
					{
						//data.canons
						Object.values(canonKeys).map((shape, i) => {
							const bounds = newPendingBounds();
							shape.scaled.forEach((coord) => addCoordToBounds(bounds, coord));
							const w = bounds.x1! - bounds.x0!;
							const h = bounds.y1! - bounds.y0!;
							const m = Math.max(w, h) * 0.1;

							return (
								<div key={i}>
									<svg
										data-key={shape.key}
										xmlns="http://www.w3.org/2000/svg"
										viewBox={`${(bounds.x0! - m).toFixed(3)} ${(bounds.y0! - m).toFixed(3)} ${(
											w + m * 2
										).toFixed(3)} ${(h + m * 2).toFixed(3)}`}
										// viewBox="-2 -2 4 4"
										style={{
											background: "black",
											width: 200,
											height: 200,
											margin: 5,
										}}
									>
										<path
											fill="green"
											// strokeWidth={0.01}
											d={
												`M` +
												shape.scaled
													.map(({ x, y }) => `${x.toFixed(3)} ${y.toFixed(3)}`)
													.join("L") +
												"Z"
											}
										/>
										{shape.scaled.map((coord, i) => (
											<circle
												key={i}
												cx={coord.x}
												cy={coord.y}
												r={m / 5}
												fill="red"
											/>
										))}
										<circle
											cx={shape.scaled[0].x}
											cy={shape.scaled[0].y}
											r={m / 3}
											fill="red"
										/>
										{/*
                                    <path
                                        fill="red"
                                        opacity={0.5}
                                        // strokeWidth={0.01}
                                        d={
                                            `M` +
                                            fixed
                                                .map(({x, y}) => `${x.toFixed(3)} ${y.toFixed(3)}`)
                                                .join('L') +
                                            'Z'
                                        }
                                    /> */}

										{/* {shape.overlap?.map((shape) => (
                                        <path
                                            fill="red"
                                            opacity={0.5}
                                            // strokeWidth={0.01}
                                            d={
                                                `M` +
                                                shape
                                                    .map(
                                                        ({x, y}) =>
                                                            `${x.toFixed(3)} ${y.toFixed(3)}`,
                                                    )
                                                    .join('L') +
                                                'Z'
                                            }
                                        />
                                    ))} */}
										{/* <path
                                        fill="white"
                                        opacity={0.5}
                                        // strokeWidth={0.01}
                                        d={
                                            `M` +
                                            data.bounds
                                                .map((coord) => applyMatrices(coord, shape.tx))
                                                .map(({x, y}) => `${x.toFixed(3)} ${y.toFixed(3)}`)
                                                .join('L') +
                                            'Z'
                                        }
                                    /> */}
									</svg>
									<div>{humanReadableFraction(shape.percentage)}</div>
								</div>
							);
						})
					}
				</div>
			</div>
		</div>
	);
};
export default Pattern;
