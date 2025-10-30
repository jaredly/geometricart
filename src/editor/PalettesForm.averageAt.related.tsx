import {Coord} from '../types';
import {rgbToHsl} from '../rendering/colorConvert';
// @ts-ignore
import kMeans from 'kmeans-js';
import {Rgb} from './Rgb.2';

export const averageAt = (data: ImageData, pos: Coord): Rgb => {
    const colors = [
        colorAt(data, pos),
        colorAt(data, {x: pos.x - 1, y: pos.y}),
        colorAt(data, {x: pos.x + 1, y: pos.y}),
        colorAt(data, {x: pos.x, y: pos.y - 1}),
        colorAt(data, {x: pos.x, y: pos.y + 1}),
    ];
    return {
        r: Math.round(colors.reduce((a, b) => a + b.r, 0) / colors.length),
        g: Math.round(colors.reduce((a, b) => a + b.g, 0) / colors.length),
        b: Math.round(colors.reduce((a, b) => a + b.b, 0) / colors.length),
    };
};

export const colorAt = (imageData: ImageData, {x, y}: Coord): Rgb => {
    x = Math.floor(x);
    y = Math.floor(y);
    return {
        r: imageData.data[y * (imageData.width * 4) + x * 4 + 0],
        g: imageData.data[y * (imageData.width * 4) + x * 4 + 1],
        b: imageData.data[y * (imageData.width * 4) + x * 4 + 2],
    };
    // color['alpha'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 3];
};

export const findMajorColorsExpensive = (data: ImageData, bins: number = 50, top: number = 10) => {
    const points = [];
    // // h, s, l
    // // l = 3 bins; 0.3, 0.6
    // // s = 2 bins 0.5, 1.0
    // // const bins = 50;
    // const hueBins = new Array(bins).fill(0);
    for (let x = 0; x < data.width; x++) {
        for (let y = 0; y < data.height; y++) {
            const color = colorAt(data, {x, y});
            const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
            points.push([h, s, l]);
            // // outside of range
            // // if (s < 0.5 || l > 0.9 || l < 0.2) {
            // //     continue;
            // // }
            // const hue = Math.floor(h * bins);
            // hueBins[hue]++;
        }
    }

    const km = new kMeans({K: 8});

    km.cluster(points);
    while (km.step()) {
        km.findClosestCentroids();
        km.moveCentroids();

        // console.log(km.centroids);

        if (km.hasConverged()) break;
    }

    return km.centroids; //.map((item) => item[0] * 360);

    // const sorted = hueBins
    //     .map((count, i) => ({ i, count }))
    //     .sort((a, b) => b.count - a.count)
    //     .slice(0, top)
    //     .sort((a, b) => a.i - b.i);
    // return sorted.map((item) => (item.i / bins) * 360);
};