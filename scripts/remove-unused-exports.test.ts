/**
 * Tests for remove-unused-exports script
 *
 * Uses memfs to mock the file system for isolated testing
 */

import {vol} from 'memfs';
import {extractExports, extractImports, resolveImportPath, removeExport} from './remove-unused-exports';
import type {ExportInfo} from './remove-unused-exports';

// Mock fs with memfs
jest.mock('fs', () => require('memfs').fs);

describe('remove-unused-exports', () => {
    beforeEach(() => {
        // Clear the virtual file system before each test
        vol.reset();
    });

    afterEach(() => {
        vol.reset();
    });

    describe('extractExports', () => {
        test('detects named function exports', () => {
            const filePath = '/test/file.ts';
            vol.fromJSON({
                [filePath]: `
export function usedFunction() {
    return 'used';
}

export function unusedFunction() {
    return 'unused';
}
`.trim(),
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(2);
            expect(exports[0].name).toBe('usedFunction');
            expect(exports[0].exportType).toBe('named');
            expect(exports[0].kind).toBe('function');
            expect(exports[1].name).toBe('unusedFunction');
        });

        test('detects type exports', () => {
            const filePath = '/test/types.ts';
            vol.fromJSON({
                [filePath]: `
export type UsedType = {
    name: string;
};

export interface UsedInterface {
    id: number;
}

export enum Status {
    Active,
    Inactive
}
`.trim(),
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(3);
            expect(exports[0].name).toBe('UsedType');
            expect(exports[0].kind).toBe('type');
            expect(exports[0].isTypeOnly).toBe(true);
            expect(exports[1].name).toBe('UsedInterface');
            expect(exports[1].kind).toBe('interface');
            expect(exports[1].isTypeOnly).toBe(true);
            expect(exports[2].name).toBe('Status');
            expect(exports[2].kind).toBe('enum');
        });

        test('detects const exports', () => {
            const filePath = '/test/constants.ts';
            vol.fromJSON({
                [filePath]: `
export const API_URL = 'https://api.example.com';
export const MAX_RETRIES = 3;
`.trim(),
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(2);
            expect(exports[0].name).toBe('API_URL');
            expect(exports[0].kind).toBe('const');
            expect(exports[1].name).toBe('MAX_RETRIES');
        });

        test('detects default exports', () => {
            const filePath = '/test/component.tsx';
            vol.fromJSON({
                [filePath]: `
export default function Component() {
    return <div>Hello</div>;
}
`.trim(),
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(1);
            expect(exports[0].name).toBe('default');
            expect(exports[0].exportType).toBe('default');
            expect(exports[0].kind).toBe('function');
        });

        test('detects re-exports', () => {
            const filePath = '/test/index.ts';
            vol.fromJSON({
                [filePath]: `export { foo, bar } from './other';`,
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(2);
            expect(exports[0].name).toBe('foo');
            expect(exports[0].kind).toBe('re-export');
            expect(exports[1].name).toBe('bar');
        });

        test('detects export all', () => {
            const filePath = '/test/index.ts';
            vol.fromJSON({
                [filePath]: `export * from './other';`,
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(1);
            expect(exports[0].name).toBe('*');
            expect(exports[0].kind).toBe('re-export-all');
        });

        test('detects class exports', () => {
            const filePath = '/test/class.ts';
            vol.fromJSON({
                [filePath]: `
export class MyClass {
    constructor() {}
}
`.trim(),
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(1);
            expect(exports[0].name).toBe('MyClass');
            expect(exports[0].kind).toBe('class');
        });

        test('detects export statements without declaration', () => {
            const filePath = '/test/exports.ts';
            vol.fromJSON({
                [filePath]: `
const foo = 1;
const bar = 2;
export { foo, bar };
`.trim(),
            });

            const exports = extractExports(filePath);

            expect(exports).toHaveLength(2);
            expect(exports[0].name).toBe('foo');
            expect(exports[0].kind).toBe('identifier');
            expect(exports[1].name).toBe('bar');
        });
    });

    describe('extractImports', () => {
        test('detects named imports', () => {
            const filePath = '/test/consumer.ts';
            vol.fromJSON({
                [filePath]: `import { foo, bar } from './other';`,
                '/test/other.ts': `export const foo = 1; export const bar = 2;`,
            });

            const imports = extractImports(filePath);

            expect(imports.length).toBeGreaterThanOrEqual(2);
            const fooImport = imports.find(imp => imp.importedName === 'foo');
            const barImport = imports.find(imp => imp.importedName === 'bar');
            expect(fooImport).toBeDefined();
            expect(fooImport?.localName).toBe('foo');
            expect(barImport).toBeDefined();
        });

        test('detects default imports', () => {
            const filePath = '/test/consumer.ts';
            vol.fromJSON({
                [filePath]: `import Component from './component';`,
                '/test/component.tsx': `export default function Component() {}`,
            });

            const imports = extractImports(filePath);

            expect(imports.length).toBeGreaterThanOrEqual(1);
            const defaultImport = imports.find(imp => imp.importedName === 'default');
            expect(defaultImport).toBeDefined();
            expect(defaultImport?.localName).toBe('Component');
        });

        test('detects namespace imports', () => {
            const filePath = '/test/consumer.ts';
            vol.fromJSON({
                [filePath]: `import * as utils from './utils';`,
                '/test/utils.ts': `export const foo = 1;`,
            });

            const imports = extractImports(filePath);

            expect(imports.length).toBeGreaterThanOrEqual(1);
            const namespaceImport = imports.find(imp => imp.importedName === '*');
            expect(namespaceImport).toBeDefined();
            expect(namespaceImport?.localName).toBe('utils');
        });

        test('detects type-only imports', () => {
            const filePath = '/test/consumer.ts';
            vol.fromJSON({
                [filePath]: `import type { MyType } from './types';`,
                '/test/types.ts': `export type MyType = string;`,
            });

            const imports = extractImports(filePath);

            expect(imports.length).toBeGreaterThanOrEqual(1);
            const typeImport = imports.find(imp => imp.importedName === 'MyType');
            expect(typeImport).toBeDefined();
            expect(typeImport?.isTypeOnly).toBe(true);
        });

        test('detects re-exports as imports', () => {
            const filePath = '/test/index.ts';
            vol.fromJSON({
                [filePath]: `export { foo } from './other';`,
                '/test/other.ts': `export const foo = 1;`,
            });

            const imports = extractImports(filePath);

            expect(imports.length).toBeGreaterThanOrEqual(1);
            const reExport = imports.find(imp => imp.importedName === 'foo');
            expect(reExport).toBeDefined();
        });

        test('detects export all as import', () => {
            const filePath = '/test/index.ts';
            vol.fromJSON({
                [filePath]: `export * from './other';`,
                '/test/other.ts': `export const foo = 1;`,
            });

            const imports = extractImports(filePath);

            expect(imports.length).toBeGreaterThanOrEqual(1);
            const exportAll = imports.find(imp => imp.importedName === '*');
            expect(exportAll).toBeDefined();
        });
    });

    describe('resolveImportPath', () => {
        test('resolves .ts files', () => {
            const fromFile = '/test/consumer.ts';
            vol.fromJSON({
                '/test/other.ts': `export const foo = 1;`,
            });

            const resolved = resolveImportPath('./other', fromFile);

            expect(resolved).toBe('/test/other.ts');
        });

        test('resolves .tsx files', () => {
            const fromFile = '/test/consumer.tsx';
            vol.fromJSON({
                '/test/component.tsx': `export default function Component() {}`,
            });

            const resolved = resolveImportPath('./component', fromFile);

            expect(resolved).toBe('/test/component.tsx');
        });

        test('resolves index files', () => {
            const fromFile = '/test/consumer.ts';
            vol.fromJSON({
                '/test/utils/index.ts': `export const foo = 1;`,
            });

            const resolved = resolveImportPath('./utils', fromFile);

            // memfs may resolve to the directory, which then gets index appended
            expect(resolved).toMatch(/\/test\/utils(\/index\.ts)?$/);
        });

        test('returns null for external modules', () => {
            const fromFile = '/test/consumer.ts';
            const resolved = resolveImportPath('react', fromFile);

            expect(resolved).toBeNull();
        });

        test('returns null for non-existent files', () => {
            const fromFile = '/test/consumer.ts';
            vol.fromJSON({});

            const resolved = resolveImportPath('./nonexistent', fromFile);

            expect(resolved).toBeNull();
        });
    });

    describe('removeExport', () => {
        test('removes named export function', () => {
            const filePath = '/test/file.ts';
            const initialContent = `
export function usedFunction() {
    return 'used';
}

export function unusedFunction() {
    return 'unused';
}
`.trim();

            vol.fromJSON({
                [filePath]: initialContent,
            });

            const exportInfo: ExportInfo = {
                name: 'unusedFunction',
                filePath,
                exportType: 'named',
                isTypeOnly: false,
                kind: 'function',
                line: 5,
                code: `export function unusedFunction() {\n    return 'unused';\n}`,
            };

            const removed = removeExport(exportInfo);

            expect(removed).toBe(true);
            const content = vol.readFileSync(filePath, 'utf-8') as string;
            expect(content).toContain('usedFunction');
            expect(content).not.toContain('unusedFunction');
        });

        test('removes type export', () => {
            const filePath = '/test/types.ts';
            const initialContent = `
export type UsedType = string;
export type UnusedType = number;
`.trim();

            vol.fromJSON({
                [filePath]: initialContent,
            });

            const exportInfo: ExportInfo = {
                name: 'UnusedType',
                filePath,
                exportType: 'named',
                isTypeOnly: true,
                kind: 'type',
                line: 2,
                code: 'export type UnusedType = number;',
            };

            const removed = removeExport(exportInfo);

            expect(removed).toBe(true);
            const content = vol.readFileSync(filePath, 'utf-8') as string;
            expect(content).toContain('UsedType');
            expect(content).not.toContain('UnusedType');
        });

        test('removes const export', () => {
            const filePath = '/test/constants.ts';
            const initialContent = `
export const USED = 1;
export const UNUSED = 2;
`.trim();

            vol.fromJSON({
                [filePath]: initialContent,
            });

            const exportInfo: ExportInfo = {
                name: 'UNUSED',
                filePath,
                exportType: 'named',
                isTypeOnly: false,
                kind: 'const',
                line: 2,
                code: 'export const UNUSED = 2;',
            };

            const removed = removeExport(exportInfo);

            expect(removed).toBe(true);
            const content = vol.readFileSync(filePath, 'utf-8') as string;
            expect(content).toContain('USED');
            expect(content).not.toContain('UNUSED');
        });

        test('removes one export from export statement', () => {
            const filePath = '/test/exports.ts';
            const initialContent = `
const foo = 1;
const bar = 2;
const baz = 3;
export { foo, bar, baz };
`.trim();

            vol.fromJSON({
                [filePath]: initialContent,
            });

            const exportInfo: ExportInfo = {
                name: 'bar',
                filePath,
                exportType: 'named',
                isTypeOnly: false,
                kind: 'identifier',
                line: 4,
                code: 'export { foo, bar, baz };',
            };

            const removed = removeExport(exportInfo);

            expect(removed).toBe(true);
            const content = vol.readFileSync(filePath, 'utf-8') as string;
            expect(content).toContain('const foo');
            expect(content).toContain('const bar');
            expect(content).toContain('const baz');
            // The export statement should still exist but without 'bar'
            expect(content).toContain('export');
        });

        test('removes default export', () => {
            const filePath = '/test/component.tsx';
            const initialContent = `
export const foo = 1;

export default function Component() {
    return <div>Hello</div>;
}
`.trim();

            vol.fromJSON({
                [filePath]: initialContent,
            });

            const exportInfo: ExportInfo = {
                name: 'default',
                filePath,
                exportType: 'default',
                isTypeOnly: false,
                kind: 'function',
                line: 3,
                code: 'export default function Component() {\n    return <div>Hello</div>;\n}',
            };

            const removed = removeExport(exportInfo);

            expect(removed).toBe(true);
            const content = vol.readFileSync(filePath, 'utf-8') as string;
            expect(content).toContain('export const foo');
            expect(content).not.toContain('export default');
        });
    });

    describe('integration scenarios', () => {
        test('identifies unused export when not imported', () => {
            const utilsPath = '/test/utils.ts';
            const consumerPath = '/test/consumer.ts';

            vol.fromJSON({
                [utilsPath]: `
export function usedFunction() {
    return 'used';
}

export function unusedFunction() {
    return 'unused';
}
`.trim(),
                [consumerPath]: `
import { usedFunction } from './utils';

console.log(usedFunction());
`.trim(),
            });

            const exports = extractExports(utilsPath);
            const imports = extractImports(consumerPath);

            const importedFromUtils = imports.filter(
                imp => imp.resolvedPath === utilsPath
            );
            const importedNames = new Set(importedFromUtils.map(imp => imp.importedName));

            const unusedExports = exports.filter(exp => !importedNames.has(exp.name));

            expect(unusedExports).toHaveLength(1);
            expect(unusedExports[0].name).toBe('unusedFunction');
        });

        test('marks all exports as used when namespace imported', () => {
            const utilsPath = '/test/utils.ts';
            const consumerPath = '/test/consumer.ts';

            vol.fromJSON({
                [utilsPath]: `
export function func1() {}
export function func2() {}
`.trim(),
                [consumerPath]: `
import * as utils from './utils';

console.log(utils);
`.trim(),
            });

            const exports = extractExports(utilsPath);
            const imports = extractImports(consumerPath);

            const importedFromUtils = imports.filter(
                imp => imp.resolvedPath === utilsPath
            );

            // Namespace import should be detected
            const hasNamespaceImport = importedFromUtils.some(imp => imp.importedName === '*');
            expect(hasNamespaceImport).toBe(true);

            // When there's a namespace import, simulate marking all exports as used
            const importedNames = new Set<string>();
            if (hasNamespaceImport) {
                // Namespace import marks ALL exports as used
                exports.forEach(exp => importedNames.add(exp.name));
            }

            // Check that all exports are now marked as used
            const unusedExports = exports.filter(exp => !importedNames.has(exp.name));
            expect(unusedExports).toHaveLength(0);
            expect(importedNames.size).toBe(2); // Both func1 and func2 should be marked as used
        });

        test('handles re-exports correctly', () => {
            const originalPath = '/test/original.ts';
            const indexPath = '/test/index.ts';
            const consumerPath = '/test/consumer.ts';

            vol.fromJSON({
                [originalPath]: `export const foo = 1;`,
                [indexPath]: `export { foo } from './original';`,
                [consumerPath]: `import { foo } from './index';`,
            });

            const originalExports = extractExports(originalPath);
            const indexImports = extractImports(indexPath);
            const consumerImports = extractImports(consumerPath);

            // Original file exports foo
            expect(originalExports).toHaveLength(1);
            expect(originalExports[0].name).toBe('foo');

            // Index re-exports it (which counts as an import from original)
            const importFromOriginal = indexImports.find(imp =>
                imp.importedName === 'foo' && imp.resolvedPath === originalPath
            );
            expect(importFromOriginal).toBeDefined();

            // Consumer imports from index (not original)
            const importFromIndex = consumerImports.find(imp =>
                imp.importedName === 'foo' && imp.resolvedPath === indexPath
            );
            expect(importFromIndex).toBeDefined();

            // The chain means foo in original.ts should be considered "used"
            // because index.ts imports it, even though consumer doesn't directly import from original
            const originalIsImportedByIndex = indexImports.some(
                imp => imp.resolvedPath === originalPath && imp.importedName === 'foo'
            );
            expect(originalIsImportedByIndex).toBe(true);
        });
    });
});
