import path from 'path';
import fs from 'fs';
import { Fixture } from './types';
import { serializeFixture } from './utils';

const [_, __, dir] = process.argv;

fs.readdirSync(dir)
    .filter((n) => n.endsWith('.input.txt'))
    .forEach((name) => {
        const base = name.slice(0, -'.input.txt'.length);
        const full = path.join(dir, name);
        const outputFull = path.join(dir, base + '.output.txt');
        const input = JSON.parse(fs.readFileSync(full, 'utf8'));
        const [pass, outputRaw] = fs
            .readFileSync(outputFull, 'utf8')
            .split('\n');
        const output = JSON.parse(outputRaw);
        const fixture: Fixture<unknown, unknown> = {
            name: base.replace(/-/g, ' '),
            input,
            output,
            isPassing: pass === 'pass',
        };
        fs.unlinkSync(full);
        fs.unlinkSync(outputFull);
        fs.writeFileSync(
            path.join(dir, base + '.txt'),
            serializeFixture(fixture, undefined),
        );
    });
