export function serializeObj(
    cells: [number, number, number][],
    positions: [number, number, number][],
    // vertexNormals,
    // vertexUVs,
    // faceNormals,
    // faceUVs,
    name: string,
    offset = 0,
) {
    var lines = [];

    if (name) {
        lines.push('o ' + name);
    }

    for (var i = 0; i < positions.length; i++) {
        var line = 'v ' + positions[i].join(' ');
        lines.push(line);
    }

    // if (vertexUVs) {
    //     for (var i = 0; i < vertexUVs.length; i++) {
    //         var line = 'vt ' + vertexUVs[i].join(' ');
    //         lines.push(line);
    //     }

    //     // if no UV indices provided, use position indices
    //     if (!faceUVs) {
    //         faceUVs = cells;
    //     }
    // }

    // if (vertexNormals) {
    //     for (var i = 0; i < vertexNormals.length; i++) {
    //         var line = 'vn ' + vertexNormals[i].join(' ');
    //         lines.push(line);
    //     }

    //     // if no normal indices provided, use position indices
    //     if (!faceNormals) {
    //         faceNormals = cells;
    //     }
    // }

    for (var i = 0; i < cells.length; i++) {
        var line = 'f';

        for (var j = 0; j < cells[i].length; j++) {
            line +=
                ' ' +
                [
                    cells[i][j] + 1 + offset,
                    null,
                    null,
                    // faceUVs ? faceUVs[i][j] + 1 : null,
                    // faceNormals ? faceNormals[i][j] + 1 : null,
                ].join('/');
        }

        lines.push(line);
    }

    return lines.join('\n');
}
