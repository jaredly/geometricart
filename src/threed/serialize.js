import {faceNormals as computeFaceNormals} from './normals';

function serializeVector(vec) {
    return vec
        .map(function (f) {
            return f.toExponential();
        })
        .join(' ');
}

export function serialize(cells, positions, faceNormals, name) {
    faceNormals = faceNormals || computeFaceNormals(cells, positions);
    name = name || '';

    var lines = [];
    lines.push('solid ' + name);

    for (var i = 0; i < cells.length; i++) {
        lines.push('  facet normal ' + serializeVector(faceNormals[i]));
        lines.push('    outer loop');
        for (var j = 0; j < cells[i].length; j++) {
            lines.push('      vertex ' + serializeVector(positions[cells[i][j]]));
        }
        lines.push('    endloop');
        lines.push('  endfacet');
    }

    lines.push('endsolid ' + name);
    return lines.join('\n');
}
