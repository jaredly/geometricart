// import {it, describe, expect} from '@jest/globals'

import { circleCircle } from "./intersect";

describe("circleCircle", () => {
	it("should do basic intersection", () => {
		expect(
			circleCircle(
				{ type: "circle", center: { x: 0, y: 0 }, radius: 1 },
				{ type: "circle", center: { x: 2, y: 0 }, radius: 1 },
			),
		).toEqual([{ x: 1, y: 0 }]);
	});

	it("should do no intersection", () => {
		expect(
			circleCircle(
				{ type: "circle", center: { x: -5, y: 0 }, radius: 1 },
				{ type: "circle", center: { x: 2, y: 0 }, radius: 1 },
			),
		).toEqual([]);
	});

	it("should do two intersection", () => {
		expect(
			circleCircle(
				{ type: "circle", center: { x: 0, y: 1 }, radius: 1 },
				{ type: "circle", center: { x: 1, y: 0 }, radius: 1 },
			),
		).toEqual([
			{ x: expect.closeTo(1), y: expect.closeTo(1) },
			{ x: expect.closeTo(0), y: expect.closeTo(0) },
		]);
	});

	it("should do two intersection with limits", () => {
		const off = Math.PI / 30;
		expect(
			circleCircle(
				{
					type: "circle",
					center: { x: 0, y: 1 },
					radius: 1,
					limit: [0 - off, 0 + off],
				},
				{
					type: "circle",
					center: { x: 1, y: 0 },
					radius: 1,
					limit: [Math.PI / 2 - off, Math.PI / 2 + off],
				},
			),
		).toEqual([{ x: expect.closeTo(1), y: expect.closeTo(1) }]);
	});

	it("real-world", () => {
		expect(
			circleCircle(
				{
					type: "circle",
					center: {
						x: 1,
						y: 0,
					},
					radius: 1,
					limit: [-1.6832379361558178, -1.4737984259164985],
				},
				{
					type: "circle",
					center: {
						x: 0,
						y: -1,
					},
					radius: 1,
					limit: [-0.1117618922279718, 0.09767761801134774],
				},
			),
		).toEqual([{ x: expect.closeTo(1), y: expect.closeTo(-1) }]);
	});

	it("nother one", () => {
		expect(
			circleCircle(
				{
					type: "circle",
					center: {
						x: -1,
						y: 0,
					},
					radius: 1,
					limit: [-1.6755160819145563, -1.4660765716752369],
				},
				{
					type: "circle",
					center: {
						x: 0,
						y: -1,
					},
					radius: 1,
					limit: [3.0087113314822407, 3.2181508417215605],
				},
			),
		).toEqual([{ x: expect.closeTo(-1), y: expect.closeTo(-1) }]);
	});
});
