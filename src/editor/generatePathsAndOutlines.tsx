import {State, Path, StyleLine} from '../types';
import {styleKey} from './styleKey';

export function generatePathsAndOutlines(
    multi: State['view']['multi'] & {},
    paths: Path[],
): {pathsToRender: Path[][]; outlines: Path[]} {
    // const outlines: Path[] = [];
    const pathsToRender: Path[][] = [];
    if (!multi.skipBacking) {
        pathsToRender.push([]);
    }

    const byStyleKey: Record<string, {style: StyleLine; paths: Path[]}> = {};

    paths.forEach((path) => {
        (multi.useFills ? path.style.fills : path.style.lines).forEach((style) => {
            if (style) {
                const k = styleKey(style);
                if (!byStyleKey[k]) {
                    byStyleKey[k] = {style, paths: []};
                }
                byStyleKey[k].paths.push(path);
            }
        });
    });
    // console.log("organized", byStyleKey);
    // console.log("multis", multi);
    const byGroup: {[key: string]: Path[]} = {};

    const outlines =
        multi.outline != null
            ? (byStyleKey[multi.outline]?.paths?.map((path) => ({
                  ...path,
                  style: {fills: [], lines: [byStyleKey[multi.outline!].style]},
              })) ?? [])
            : [];

    multi.shapes.forEach((shape, i) => {
        if (shape == null) return console.log('ignoring cause no shape');

        // const line = (multi.useFills ? path.style.fills : path.style.lines).find(
        //     (s) => s && styleKey(s) === shape,
        // );
        // if (!line) {
        //     // console.log(
        //     // 	multi.useFills ? path.style.fills : path.style.lines,
        //     // 	shape,
        //     // );
        //     return console.log("ignoring caus no matching style");
        // }
        if (!byStyleKey[shape]) {
            console.log('Nothing for', shape, byStyleKey);
        }

        byStyleKey[shape]?.paths.forEach((path) => {
            const oneLine = {
                ...path,
                style: {fills: [], lines: [byStyleKey[shape].style]},
            };
            const prefix = i.toString().padStart(2, '0') + ':';
            const group = multi.combineGroups ? 'aa' : path.group;
            if (group) {
                if (!byGroup[prefix + group + ':' + shape]) {
                    byGroup[prefix + group + ':' + shape] = [];
                }
                byGroup[prefix + group + ':' + shape].push(oneLine);
            } else {
                pathsToRender.push([oneLine]);
            }
        });
    });

    // paths.forEach((path) => {
    // 	// if (path.style.fills.length && !multi.useFills) {
    // 	// 	console.log("ignoring cause its filled");
    // 	// 	return;
    // 	// }
    // 	// const out = (multi.useFills ? path.style.fills : path.style.lines).find(
    // 	// 	(s) => s && styleKey(s) === multi.outline,
    // 	// );
    // 	// if (out) {
    // 	// 	outlines.push({ ...path, style: { fills: [], lines: [out] } });
    // 	// }
    // 	multi.shapes.forEach((shape, i) => {
    // 		if (shape == null) return console.log("ignoring cause no shape");
    // 		const line = (multi.useFills ? path.style.fills : path.style.lines).find(
    // 			(s) => s && styleKey(s) === shape,
    // 		);
    // 		if (!line) {
    // 			// console.log(
    // 			// 	multi.useFills ? path.style.fills : path.style.lines,
    // 			// 	shape,
    // 			// );
    // 			return console.log("ignoring caus no matching style");
    // 		}
    // 		const oneLine = {
    // 			...path,
    // 			style: { fills: [], lines: [line] },
    // 		};
    // 		const prefix = i.toString().padStart(2, "0") + ":";
    // 		const group = multi.combineGroups ? "aa" : path.group;
    // 		if (group) {
    // 			if (!byGroup[prefix + group + ":" + shape]) {
    // 				byGroup[prefix + group + ":" + shape] = [];
    // 			}
    // 			byGroup[prefix + group + ":" + shape].push(oneLine);
    // 		} else {
    // 			pathsToRender.push([oneLine]);
    // 		}
    // 	});
    // });
    console.log('bygrouped', byGroup);
    pathsToRender.push(
        ...Object.keys(byGroup)
            .sort()
            .map((k) => byGroup[k]),
    );
    return {pathsToRender, outlines};
}
