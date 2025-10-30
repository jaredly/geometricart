/**
 * Remove Unused Exports
 *
 * Analyzes the TypeScript project to find exports that are never imported anywhere
 * and optionally removes them.
 *
 * Usage:
 *   bun scripts/remove-unused-exports.ts [options]
 *
 * Options:
 *   --dry-run         Show unused exports without removing them (default)
 *   --fix             Actually remove the unused exports
 *   --entry <paths>   Comma-separated list of entry point files/patterns to keep all exports
 *                     (e.g., "src/index.ts,src/run.tsx")
 *   --ignore <paths>  Comma-separated list of file patterns to ignore
 *                     (e.g., "test.ts,vest.ts patterns")
 *   --verbose         Show detailed information about each export
 *   --json            Output results as JSON
 *
 * Examples:
 *   # Dry run - see what would be removed
 *   bun scripts/remove-unused-exports.ts
 *
 *   # Remove unused exports
 *   bun scripts/remove-unused-exports.ts --fix
 *
 *   # Specify entry points to preserve
 *   bun scripts/remove-unused-exports.ts --entry "src/index.ts,src/run.tsx" --fix
 *
 *   # Verbose output
 *   bun scripts/remove-unused-exports.ts --verbose
 *
 *   # JSON output for tooling
 *   bun scripts/remove-unused-exports.ts --json
 *
 * Entry Points:
 *   By default, the following are considered entry points where all exports are kept:
 *   - src/index.ts
 *   - src/run.tsx
 *   - Files matching client.tsx and server.tsx patterns
 *
 * Notes:
 *   - Default exports in files with only a default export are kept
 *   - Re-exports are analyzed to track usage
 *   - Type-only exports are handled correctly
 *   - The script respects .gitignore patterns
 */

import * as parser from '@babel/parser';
import traverse, {NodePath} from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';
import {glob} from 'fast-glob';

// Cache for tsconfig
let tsconfigCache: {rootDirs?: string[]; projectRoot: string} | null = null;

interface ExportInfo {
    name: string;
    filePath: string;
    exportType: 'named' | 'default';
    isTypeOnly: boolean;
    kind: string; // 'function', 'class', 'const', 'type', 'interface', etc.
    line: number;
    code: string;
}

interface ImportInfo {
    importedName: string;
    localName: string;
    filePath: string;
    importedFrom: string;
    resolvedPath: string;
    isTypeOnly: boolean;
}

interface AnalysisResult {
    exports: Map<string, ExportInfo[]>; // key: filePath
    resolvedImports: Record<string, string[]>;
    imports: ImportInfo[];
    unusedExports: ExportInfo[];
}

interface Options {
    dryRun: boolean;
    fix: boolean;
    entryPoints: string[];
    ignore: string[];
    verbose: boolean;
    json: boolean;
}

/**
 * Loads and caches tsconfig rootDirs
 */
function loadTsConfig(): {rootDirs?: string[]; projectRoot: string} {
    if (tsconfigCache) {
        return tsconfigCache;
    }

    const projectRoot = path.resolve(__dirname, '..');
    const tsconfigPath = path.resolve(projectRoot, 'tsconfig.json');

    try {
        if (fs.existsSync(tsconfigPath)) {
            const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
            // Simple JSON parse (ignoring comments for now)
            const tsconfig = JSON.parse(tsconfigContent);
            const rootDirs = tsconfig.compilerOptions?.rootDirs as string[] | undefined;

            tsconfigCache = {
                rootDirs: rootDirs?.map((dir) => path.resolve(projectRoot, dir)),
                projectRoot: projectRoot,
            };
        } else {
            tsconfigCache = {projectRoot: projectRoot};
        }
    } catch (error) {
        tsconfigCache = {projectRoot: projectRoot};
    }

    return tsconfigCache;
}

/**
 * Resolves an import path to an absolute file path
 */
function resolveImportPath(importPath: string, fromFile: string): string | null {
    if (!importPath.startsWith('.')) {
        // External module
        return null;
    }

    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importPath);

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
    for (const ext of extensions) {
        const fullPath = resolved + ext;
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            return fullPath;
        }
    }

    // Try index files
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const indexPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexPath)) {
            return indexPath;
        }
    }

    // If not found, try with rootDirs from tsconfig
    const {rootDirs, projectRoot} = loadTsConfig();
    if (rootDirs && rootDirs.length > 1) {
        // Get the relative path from fromFile to project root
        const fromFileRelative = path.relative(projectRoot, fromFile);
        const fromDirRelative = path.dirname(fromFileRelative);

        // Try each rootDir
        for (const rootDir of rootDirs) {
            // Construct alternative path: rootDir + fromDirRelative + importPath
            const alternativeResolved = path.resolve(rootDir, fromDirRelative, importPath);

            // Try with extensions
            for (const ext of extensions) {
                const fullPath = alternativeResolved + ext;
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                    return fullPath;
                }
            }

            // Try index files
            for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                const indexPath = path.join(alternativeResolved, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                    return indexPath;
                }
            }
        }
    }

    if (importPath.startsWith('.')) {
        console.warn(`Unable to resolve ${importPath} from ${fromFile}`);
    }

    return null;
}

/**
 * Extracts all exports from a file
 */
function extractExports(filePath: string): ExportInfo[] {
    const code = fs.readFileSync(filePath, 'utf-8');
    const exports: ExportInfo[] = [];

    try {
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy'],
        });

        const lines = code.split('\n');

        traverse(ast, {
            ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
                const node = nodePath.node;
                const isTypeOnly = node.exportKind === 'type';

                // Re-export: export { foo } from './bar'
                if (node.source) {
                    node.specifiers.forEach((spec) => {
                        if (t.isExportSpecifier(spec)) {
                            const exportedName = t.isIdentifier(spec.exported)
                                ? spec.exported.name
                                : t.isStringLiteral(spec.exported)
                                  ? spec.exported.value
                                  : 'unknown';
                            const localName = spec.local.name;

                            exports.push({
                                name: exportedName,
                                filePath,
                                exportType: 'named',
                                isTypeOnly: isTypeOnly || spec.exportKind === 'type',
                                kind: 're-export',
                                line: node.loc?.start.line || 0,
                                code: code.substring(node.start || 0, node.end || 0),
                            });
                        }
                    });
                    return;
                }

                // Export without declaration: export { foo, bar }
                if (!node.declaration && node.specifiers.length > 0) {
                    node.specifiers.forEach((spec) => {
                        if (t.isExportSpecifier(spec)) {
                            const exportedName = t.isIdentifier(spec.exported)
                                ? spec.exported.name
                                : t.isStringLiteral(spec.exported)
                                  ? spec.exported.value
                                  : 'unknown';

                            exports.push({
                                name: exportedName,
                                filePath,
                                exportType: 'named',
                                isTypeOnly: isTypeOnly || spec.exportKind === 'type',
                                kind: 'identifier',
                                line: node.loc?.start.line || 0,
                                code: code.substring(node.start || 0, node.end || 0),
                            });
                        }
                    });
                    return;
                }

                const declaration = node.declaration;
                if (!declaration) return;

                // Function declarations
                if (t.isFunctionDeclaration(declaration) && declaration.id) {
                    exports.push({
                        name: declaration.id.name,
                        filePath,
                        exportType: 'named',
                        isTypeOnly: false,
                        kind: 'function',
                        line: node.loc?.start.line || 0,
                        code: code.substring(node.start || 0, node.end || 0),
                    });
                }
                // Class declarations
                else if (t.isClassDeclaration(declaration) && declaration.id) {
                    exports.push({
                        name: declaration.id.name,
                        filePath,
                        exportType: 'named',
                        isTypeOnly: false,
                        kind: 'class',
                        line: node.loc?.start.line || 0,
                        code: code.substring(node.start || 0, node.end || 0),
                    });
                }
                // Variable declarations
                else if (t.isVariableDeclaration(declaration)) {
                    declaration.declarations.forEach((declarator) => {
                        if (t.isIdentifier(declarator.id)) {
                            exports.push({
                                name: declarator.id.name,
                                filePath,
                                exportType: 'named',
                                isTypeOnly: false,
                                kind: 'const',
                                line: node.loc?.start.line || 0,
                                code: code.substring(node.start || 0, node.end || 0),
                            });
                        }
                    });
                }
                // Type aliases
                else if (t.isTSTypeAliasDeclaration(declaration)) {
                    exports.push({
                        name: declaration.id.name,
                        filePath,
                        exportType: 'named',
                        isTypeOnly: true,
                        kind: 'type',
                        line: node.loc?.start.line || 0,
                        code: code.substring(node.start || 0, node.end || 0),
                    });
                }
                // Interfaces
                else if (t.isTSInterfaceDeclaration(declaration)) {
                    exports.push({
                        name: declaration.id.name,
                        filePath,
                        exportType: 'named',
                        isTypeOnly: true,
                        kind: 'interface',
                        line: node.loc?.start.line || 0,
                        code: code.substring(node.start || 0, node.end || 0),
                    });
                }
                // Enums
                else if (t.isTSEnumDeclaration(declaration)) {
                    exports.push({
                        name: declaration.id.name,
                        filePath,
                        exportType: 'named',
                        isTypeOnly: false,
                        kind: 'enum',
                        line: node.loc?.start.line || 0,
                        code: code.substring(node.start || 0, node.end || 0),
                    });
                }
            },

            ExportDefaultDeclaration(nodePath: NodePath<t.ExportDefaultDeclaration>) {
                const node = nodePath.node;
                const declaration = node.declaration;

                let name = 'default';
                let kind = 'unknown';

                if (t.isFunctionDeclaration(declaration) && declaration.id) {
                    name = declaration.id.name;
                    kind = 'function';
                } else if (t.isClassDeclaration(declaration) && declaration.id) {
                    name = declaration.id.name;
                    kind = 'class';
                } else if (t.isIdentifier(declaration)) {
                    name = declaration.name;
                    kind = 'identifier';
                }

                exports.push({
                    name: 'default',
                    filePath,
                    exportType: 'default',
                    isTypeOnly: false,
                    kind,
                    line: node.loc?.start.line || 0,
                    code: code.substring(node.start || 0, node.end || 0),
                });
            },

            // Handle export all: export * from './foo'
            ExportAllDeclaration(nodePath: NodePath<t.ExportAllDeclaration>) {
                const node = nodePath.node;
                // We track these but don't mark them as unused since they're pass-through
                exports.push({
                    name: '*',
                    filePath,
                    exportType: 'named',
                    isTypeOnly: node.exportKind === 'type',
                    kind: 're-export-all',
                    line: node.loc?.start.line || 0,
                    code: code.substring(node.start || 0, node.end || 0),
                });
            },
        });
    } catch (error: any) {
        console.error(`Error parsing ${filePath}: ${error.message}`);
    }

    return exports;
}

/**
 * Extracts all imports from a file
 */
function extractImports(filePath: string): ImportInfo[] {
    const code = fs.readFileSync(filePath, 'utf-8');
    const imports: ImportInfo[] = [];

    try {
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy'],
        });

        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
                const node = nodePath.node;
                const importPath = node.source.value;
                const resolvedPath = resolveImportPath(importPath, filePath);
                if (!resolvedPath) {
                    return;
                }
                const isTypeOnly = node.importKind === 'type';

                node.specifiers.forEach((spec) => {
                    if (t.isImportDefaultSpecifier(spec)) {
                        imports.push({
                            importedName: 'default',
                            localName: spec.local.name,
                            filePath,
                            importedFrom: importPath,
                            resolvedPath,
                            isTypeOnly,
                        });
                    } else if (t.isImportSpecifier(spec)) {
                        const importedName = t.isIdentifier(spec.imported)
                            ? spec.imported.name
                            : spec.imported.value;
                        imports.push({
                            importedName,
                            localName: spec.local.name,
                            filePath,
                            importedFrom: importPath,
                            resolvedPath,
                            isTypeOnly: isTypeOnly || spec.importKind === 'type',
                        });
                    } else if (t.isImportNamespaceSpecifier(spec)) {
                        imports.push({
                            importedName: '*',
                            localName: spec.local.name,
                            filePath,
                            importedFrom: importPath,
                            resolvedPath,
                            isTypeOnly,
                        });
                    }
                });
            },

            // Handle dynamic imports: import('./foo')
            CallExpression(nodePath: NodePath<t.CallExpression>) {
                const node = nodePath.node;
                if (t.isImport(node.callee) && node.arguments.length > 0) {
                    const arg = node.arguments[0];
                    if (t.isStringLiteral(arg)) {
                        const importPath = arg.value;
                        const resolvedPath = resolveImportPath(importPath, filePath);
                        if (!resolvedPath) return;
                        // Dynamic imports import the entire module
                        imports.push({
                            importedName: '*',
                            localName: '*',
                            filePath,
                            importedFrom: importPath,
                            resolvedPath,
                            isTypeOnly: false,
                        });
                    }
                }
            },

            // Handle re-exports: export { foo } from './bar'
            ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
                const node = nodePath.node;
                if (node.source) {
                    const importPath = node.source.value;
                    const resolvedPath = resolveImportPath(importPath, filePath);
                    if (!resolvedPath) return;
                    const isTypeOnly = node.exportKind === 'type';

                    node.specifiers.forEach((spec) => {
                        if (t.isExportSpecifier(spec)) {
                            const importedName = spec.local.name;
                            imports.push({
                                importedName,
                                localName: importedName,
                                filePath,
                                importedFrom: importPath,
                                resolvedPath,
                                isTypeOnly: isTypeOnly || spec.exportKind === 'type',
                            });
                        }
                    });
                }
            },

            // Handle export all: export * from './foo'
            ExportAllDeclaration(nodePath: NodePath<t.ExportAllDeclaration>) {
                const node = nodePath.node;
                const importPath = node.source.value;
                const resolvedPath = resolveImportPath(importPath, filePath);
                if (!resolvedPath) return;

                imports.push({
                    importedName: '*',
                    localName: '*',
                    filePath,
                    importedFrom: importPath,
                    resolvedPath,
                    isTypeOnly: node.exportKind === 'type',
                });
            },
        });
    } catch (error: any) {
        console.error(`Error parsing ${filePath}: ${error.message}`);
    }

    return imports;
}

/**
 * Analyzes the project to find unused exports
 */
async function analyzeProject(options: Options): Promise<AnalysisResult> {
    const projectRoot = path.resolve(__dirname, '..');

    // Find all TypeScript/TSX files
    const defaultIgnore = [
        '**/node_modules/**',
        '**/build/**',
        '**/dist/**',
        '**/*.d.ts',
        ...options.ignore,
    ];

    const files = await glob(['**/*.{ts,tsx}'], {
        cwd: projectRoot,
        absolute: true,
        ignore: defaultIgnore,
    });

    if (options.verbose) {
        console.log(`Found ${files.length} files to analyze\n`);
    }

    // Extract all exports and imports
    const exportsMap = new Map<string, ExportInfo[]>();
    const resolvedImports: Record<string, string[]> = {};
    const allImports: ImportInfo[] = [];

    for (const file of files) {
        const exports = extractExports(file);
        if (exports.length > 0) {
            exportsMap.set(file, exports);
        }

        const imports = extractImports(file);
        imports.forEach((imp) => {
            if (!resolvedImports[imp.resolvedPath]) {
                resolvedImports[imp.resolvedPath] = [];
            }
            if (!resolvedImports[imp.resolvedPath].includes(imp.importedName)) {
                resolvedImports[imp.resolvedPath].push(imp.importedName);
            }
        });
        allImports.push(...imports);
    }

    // Determine entry points
    const defaultEntryPoints = ['src/index.ts', 'src/run.tsx'].map((p) =>
        path.resolve(projectRoot, p),
    );

    const entryPointPatterns = [
        ...defaultEntryPoints,
        ...options.entryPoints.map((p) => path.resolve(projectRoot, p)),
    ];

    const entryPointFiles = new Set<string>();
    for (const file of files) {
        // Check if file matches any entry point pattern
        if (
            entryPointPatterns.some(
                (pattern) =>
                    file === pattern || file.includes('client.tsx') || file.includes('server.tsx'),
            )
        ) {
            entryPointFiles.add(file);
        }
    }

    if (options.verbose) {
        console.log('Entry points:');
        entryPointFiles.forEach((f) => console.log(`  - ${path.relative(projectRoot, f)}`));
        console.log('');
    }

    // Find unused exports
    const unusedExports: ExportInfo[] = [];

    for (const [filePath, exports] of exportsMap.entries()) {
        // Skip entry point files
        if (entryPointFiles.has(filePath)) {
            continue;
        }

        // Don't mess with react-router routes
        if (filePath.includes('/routes/') && exports.some((e) => e.name === 'loader')) {
            continue;
        }

        const importedNames = resolvedImports[filePath] ?? [];

        for (const exp of exports) {
            // Skip re-export-all
            if (exp.kind === 're-export-all') {
                continue;
            }

            // Skip if imported
            if (importedNames.includes(exp.name)) {
                continue;
            }

            unusedExports.push(exp);
        }
    }

    return {
        exports: exportsMap,
        resolvedImports,
        imports: allImports,
        unusedExports,
    };
}

/**
 * Removes an export from a file (removes the export keyword, keeps the declaration)
 */
function removeExport(exportInfo: ExportInfo): boolean {
    try {
        const code = fs.readFileSync(exportInfo.filePath, 'utf-8');
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy'],
        });

        let modified = false;
        const modifications: Array<{start: number; end: number; replacement: string}> = [];

        traverse(ast, {
            ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
                const node = nodePath.node;

                // Handle named exports without declaration: export { foo, bar }
                if (!node.declaration && node.specifiers.length > 0) {
                    const specifiersToKeep = node.specifiers.filter((spec) => {
                        if (t.isExportSpecifier(spec)) {
                            const exportedName = t.isIdentifier(spec.exported)
                                ? spec.exported.name
                                : t.isStringLiteral(spec.exported)
                                  ? spec.exported.value
                                  : 'unknown';
                            return exportedName !== exportInfo.name;
                        }
                        return true;
                    });

                    if (specifiersToKeep.length === 0) {
                        // Remove entire export statement (nothing left to export)
                        if (node.start != null && node.end != null) {
                            // Find the full line(s) to remove
                            let start = node.start;
                            let end = node.end;

                            // Find start of line
                            while (start > 0 && code[start - 1] !== '\n') {
                                start--;
                            }

                            // Find end of line (include the newline)
                            while (end < code.length && code[end] !== '\n') {
                                end++;
                            }
                            if (end < code.length) {
                                end++; // Include the newline
                            }

                            modifications.push({start, end, replacement: ''});
                            modified = true;
                        }
                    } else if (specifiersToKeep.length !== node.specifiers.length) {
                        // Regenerate the export statement with only the kept items
                        if (node.start != null && node.end != null) {
                            // Get the names to keep
                            const keptNames = specifiersToKeep
                                .map((spec) => {
                                    if (t.isExportSpecifier(spec)) {
                                        // In ExportSpecifier, local is always an Identifier
                                        const local = spec.local.name;
                                        // exported can be Identifier or StringLiteral (for string exports like "default")
                                        const exported = t.isIdentifier(spec.exported)
                                            ? spec.exported.name
                                            : spec.exported.value;
                                        // If local and exported are different, use "local as exported"
                                        return local === exported
                                            ? local
                                            : `${local} as ${exported}`;
                                    }
                                    return '';
                                })
                                .filter(Boolean);

                            // Check if this is a re-export (has a 'from' clause)
                            const fromClause = node.source ? ` from '${node.source.value}'` : '';

                            // Reconstruct the export statement
                            const replacement = `export { ${keptNames.join(', ')} }${fromClause};`;

                            modifications.push({
                                start: node.start,
                                end: node.end,
                                replacement,
                            });
                            modified = true;
                        }
                    }
                    return;
                }

                const declaration = node.declaration;
                if (!declaration) return;

                // For declarations, just remove the "export " keyword
                let shouldRemoveExport = false;

                if (
                    t.isFunctionDeclaration(declaration) &&
                    declaration.id?.name === exportInfo.name
                ) {
                    shouldRemoveExport = true;
                } else if (
                    t.isClassDeclaration(declaration) &&
                    declaration.id?.name === exportInfo.name
                ) {
                    shouldRemoveExport = true;
                } else if (t.isVariableDeclaration(declaration)) {
                    // For variable declarations with multiple declarators, check if this one matches
                    const hasMatch = declaration.declarations.some((declarator) => {
                        if (t.isIdentifier(declarator.id)) {
                            return declarator.id.name === exportInfo.name;
                        }
                        return false;
                    });

                    if (hasMatch) {
                        // If there's only one declarator, remove export keyword
                        if (declaration.declarations.length === 1) {
                            shouldRemoveExport = true;
                        } else {
                            // Multiple declarators - need to split them up (complex case)
                            // For now, just remove export from all (TODO: handle splitting)
                            shouldRemoveExport = true;
                        }
                    }
                } else if (
                    t.isTSTypeAliasDeclaration(declaration) &&
                    declaration.id.name === exportInfo.name
                ) {
                    shouldRemoveExport = true;
                } else if (
                    t.isTSInterfaceDeclaration(declaration) &&
                    declaration.id.name === exportInfo.name
                ) {
                    shouldRemoveExport = true;
                } else if (
                    t.isTSEnumDeclaration(declaration) &&
                    declaration.id.name === exportInfo.name
                ) {
                    shouldRemoveExport = true;
                }

                if (shouldRemoveExport && node.start != null && declaration.start != null) {
                    // Remove just the "export " keyword (from node.start to declaration.start)
                    modifications.push({
                        start: node.start,
                        end: declaration.start,
                        replacement: '',
                    });
                    modified = true;
                }
            },

            ExportDefaultDeclaration(nodePath: NodePath<t.ExportDefaultDeclaration>) {
                if (
                    exportInfo.exportType === 'default' &&
                    nodePath.node.start != null &&
                    nodePath.node.end != null
                ) {
                    const node = nodePath.node;
                    const declaration = node.declaration;

                    // For default exports, we need to handle them specially
                    // If it's a named declaration, keep it but remove "export default"
                    if (
                        (t.isFunctionDeclaration(declaration) && declaration.id) ||
                        (t.isClassDeclaration(declaration) && declaration.id)
                    ) {
                        // Remove "export default " and keep the declaration
                        if (declaration.start != null && node.start != null) {
                            modifications.push({
                                start: node.start,
                                end: declaration.start,
                                replacement: '',
                            });
                            modified = true;
                        }
                    } else {
                        // Anonymous default export - remove the whole thing
                        const start = node.start;
                        const end = node.end;

                        if (start != null && end != null) {
                            let lineStart = start;
                            let lineEnd = end;

                            while (lineStart > 0 && code[lineStart - 1] !== '\n') {
                                lineStart--;
                            }
                            while (lineEnd < code.length && code[lineEnd] !== '\n') {
                                lineEnd++;
                            }
                            if (lineEnd < code.length) {
                                lineEnd++;
                            }

                            modifications.push({start: lineStart, end: lineEnd, replacement: ''});
                            modified = true;
                        }
                    }
                }
            },
        });

        if (modified) {
            // Sort modifications by position (descending) to apply from end to start
            modifications.sort((a, b) => b.start - a.start);

            let newCode = code;
            for (const mod of modifications) {
                newCode =
                    newCode.substring(0, mod.start) + mod.replacement + newCode.substring(mod.end);
            }

            fs.writeFileSync(exportInfo.filePath, newCode, 'utf-8');
            return true;
        }

        return false;
    } catch (error: any) {
        console.error(`Error removing export from ${exportInfo.filePath}: ${error.message}`);
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    const options: Options = {
        dryRun: !args.includes('--fix'),
        fix: args.includes('--fix'),
        entryPoints: [],
        ignore: [],
        verbose: args.includes('--verbose'),
        json: args.includes('--json'),
    };

    // Parse entry points
    const entryIndex = args.indexOf('--entry');
    if (entryIndex !== -1 && args[entryIndex + 1]) {
        options.entryPoints = args[entryIndex + 1].split(',').map((s) => s.trim());
    }

    // Parse ignore patterns
    const ignoreIndex = args.indexOf('--ignore');
    if (ignoreIndex !== -1 && args[ignoreIndex + 1]) {
        options.ignore = args[ignoreIndex + 1].split(',').map((s) => s.trim());
    }

    if (!options.json) {
        console.log('🔍 Analyzing project for unused exports...\n');
    }

    const result = await analyzeProject(options);

    if (options.json) {
        fs.writeFileSync('./unused-exports.json', JSON.stringify(result, null, 2));
        console.log(`Written to ./unused-exports.json`);
        return;
    }

    // Group by file
    const unusedByFile = new Map<string, ExportInfo[]>();
    for (const exp of result.unusedExports) {
        if (!unusedByFile.has(exp.filePath)) {
            unusedByFile.set(exp.filePath, []);
        }
        unusedByFile.get(exp.filePath)!.push(exp);
    }

    const projectRoot = path.resolve(__dirname, '..');

    console.log(`📊 Analysis Results:`);
    console.log(`   Total files: ${result.exports.size}`);
    console.log(
        `   Total exports: ${Array.from(result.exports.values()).reduce((sum, arr) => sum + arr.length, 0)}`,
    );
    console.log(`   Total imports: ${result.imports.length}`);
    console.log(`   Unused exports: ${result.unusedExports.length}`);
    console.log('');

    if (result.unusedExports.length === 0) {
        console.log('✅ No unused exports found! Your codebase is clean.');
        return;
    }

    console.log('🗑️  Unused Exports:\n');

    for (const [filePath, exports] of unusedByFile.entries()) {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`📄 ${relativePath}`);

        for (const exp of exports) {
            const typeLabel = exp.isTypeOnly ? ' [type]' : '';
            const exportTypeLabel = exp.exportType === 'default' ? 'default' : 'named';
            console.log(
                `   - ${exp.name} (${exp.kind}, ${exportTypeLabel}${typeLabel}) at line ${exp.line}`,
            );

            if (options.verbose) {
                console.log(`     ${exp.code.split('\n')[0]}`);
            }
        }
        console.log('');
    }

    if (options.fix) {
        console.log('🔧 Removing unused export keywords (keeping declarations)...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const exp of result.unusedExports) {
            const relativePath = path.relative(projectRoot, exp.filePath);
            try {
                const removed = removeExport(exp);
                if (removed) {
                    console.log(`✅ Removed export from ${exp.name} in ${relativePath}`);
                    successCount++;
                } else {
                    console.log(`⚠️  Could not remove export from ${exp.name} in ${relativePath}`);
                }
            } catch (error) {
                console.error(`❌ Error removing export from ${exp.name} in ${relativePath}`);
                errorCount++;
            }
        }

        console.log(
            `\n✅ Completed: ${successCount} export keywords removed, ${errorCount} errors`,
        );
    } else {
        console.log('💡 Tip: Run with --fix to automatically remove unused export keywords');
        console.log('   Example: bun scripts/remove-unused-exports.ts --fix');
        console.log('   Note: Declarations are kept, only the export keyword is removed');
    }
}

// Export for testing
export {extractExports, extractImports, resolveImportPath, removeExport};

export {ExportInfo};

// Only run main if this is the entry point (not when imported)
if (typeof require !== 'undefined' && require.main === module) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
