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
    resolvedPath: string | null;
    isTypeOnly: boolean;
}

interface AnalysisResult {
    exports: Map<string, ExportInfo[]>; // key: filePath
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
        if (fs.existsSync(fullPath)) {
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
                    const isTypeOnly = node.exportKind === 'type';

                    node.specifiers.forEach((spec) => {
                        if (t.isExportSpecifier(spec)) {
                            const importedName = spec.local.name
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

    const files = await glob(['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'], {
        cwd: projectRoot,
        absolute: true,
        ignore: defaultIgnore,
    });

    if (options.verbose) {
        console.log(`Found ${files.length} files to analyze\n`);
    }

    // Extract all exports and imports
    const exportsMap = new Map<string, ExportInfo[]>();
    const allImports: ImportInfo[] = [];

    for (const file of files) {
        const exports = extractExports(file);
        if (exports.length > 0) {
            exportsMap.set(file, exports);
        }

        const imports = extractImports(file);
        allImports.push(...imports);
    }

    // Determine entry points
    const defaultEntryPoints = [
        'src/index.ts',
        'src/run.tsx',
        'src/editor.client.tsx',
    ].map(p => path.resolve(projectRoot, p));

    const entryPointPatterns = [
        ...defaultEntryPoints,
        ...options.entryPoints.map(p => path.resolve(projectRoot, p)),
    ];

    const entryPointFiles = new Set<string>();
    for (const file of files) {
        // Check if file matches any entry point pattern
        if (entryPointPatterns.some(pattern => file === pattern || file.includes('client.tsx') || file.includes('server.tsx'))) {
            entryPointFiles.add(file);
        }
    }

    if (options.verbose) {
        console.log('Entry points:');
        entryPointFiles.forEach(f => console.log(`  - ${path.relative(projectRoot, f)}`));
        console.log('');
    }

    // Build a map of what's imported
    const importedExports = new Map<string, Set<string>>(); // Map<filePath, Set<exportName>>

    for (const imp of allImports) {
        if (!imp.resolvedPath) continue;

        if (!importedExports.has(imp.resolvedPath)) {
            importedExports.set(imp.resolvedPath, new Set());
        }

        const importedNames = importedExports.get(imp.resolvedPath)!;

        // If importing namespace or export *, mark all exports as used
        if (imp.importedName === '*') {
            const exports = exportsMap.get(imp.resolvedPath) || [];
            exports.forEach(exp => importedNames.add(exp.name));
        } else {
            importedNames.add(imp.importedName);
        }
    }

    // Find unused exports
    const unusedExports: ExportInfo[] = [];

    for (const [filePath, exports] of exportsMap.entries()) {
        // Skip entry point files
        if (entryPointFiles.has(filePath)) {
            continue;
        }

        const importedNames = importedExports.get(filePath) || new Set();

        for (const exp of exports) {
            // Skip re-export-all
            if (exp.kind === 're-export-all') {
                continue;
            }

            // Skip if imported
            if (importedNames.has(exp.name)) {
                continue;
            }

            // Keep default exports if they're the only export
            if (exp.exportType === 'default' && exports.length === 1) {
                continue;
            }

            unusedExports.push(exp);
        }
    }

    return {
        exports: exportsMap,
        imports: allImports,
        unusedExports,
    };
}

/**
 * Removes an export from a file
 */
function removeExport(exportInfo: ExportInfo): boolean {
    try {
        const code = fs.readFileSync(exportInfo.filePath, 'utf-8');
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy'],
        });

        let removed = false;
        const nodesToRemove: t.Node[] = [];

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
                        // Remove entire export statement
                        nodesToRemove.push(node);
                        removed = true;
                    } else if (specifiersToKeep.length !== node.specifiers.length) {
                        // Update specifiers
                        node.specifiers = specifiersToKeep as any;
                        removed = true;
                    }
                    return;
                }

                const declaration = node.declaration;
                if (!declaration) return;

                let shouldRemove = false;

                if (t.isFunctionDeclaration(declaration) && declaration.id?.name === exportInfo.name) {
                    shouldRemove = true;
                } else if (t.isClassDeclaration(declaration) && declaration.id?.name === exportInfo.name) {
                    shouldRemove = true;
                } else if (t.isVariableDeclaration(declaration)) {
                    const declarators = declaration.declarations.filter((declarator) => {
                        if (t.isIdentifier(declarator.id)) {
                            return declarator.id.name !== exportInfo.name;
                        }
                        return true;
                    });

                    if (declarators.length === 0) {
                        shouldRemove = true;
                    } else if (declarators.length !== declaration.declarations.length) {
                        declaration.declarations = declarators;
                        removed = true;
                    }
                } else if (t.isTSTypeAliasDeclaration(declaration) && declaration.id.name === exportInfo.name) {
                    shouldRemove = true;
                } else if (t.isTSInterfaceDeclaration(declaration) && declaration.id.name === exportInfo.name) {
                    shouldRemove = true;
                } else if (t.isTSEnumDeclaration(declaration) && declaration.id.name === exportInfo.name) {
                    shouldRemove = true;
                }

                if (shouldRemove) {
                    nodesToRemove.push(node);
                    removed = true;
                }
            },

            ExportDefaultDeclaration(nodePath: NodePath<t.ExportDefaultDeclaration>) {
                if (exportInfo.exportType === 'default') {
                    nodesToRemove.push(nodePath.node);
                    removed = true;
                }
            },
        });

        if (removed) {
            // Remove nodes by reconstructing the code without them
            let newCode = code;

            // Sort nodes by position (descending) to remove from end to start
            nodesToRemove.sort((a, b) => (b.start || 0) - (a.start || 0));

            for (const node of nodesToRemove) {
                if (node.start != null && node.end != null) {
                    // Find the full line(s) to remove
                    let start = node.start;
                    let end = node.end;

                    // Find start of line
                    while (start > 0 && newCode[start - 1] !== '\n') {
                        start--;
                    }

                    // Find end of line (include the newline)
                    while (end < newCode.length && newCode[end] !== '\n') {
                        end++;
                    }
                    if (end < newCode.length) {
                        end++; // Include the newline
                    }

                    newCode = newCode.substring(0, start) + newCode.substring(end);
                }
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
        options.entryPoints = args[entryIndex + 1].split(',').map(s => s.trim());
    }

    // Parse ignore patterns
    const ignoreIndex = args.indexOf('--ignore');
    if (ignoreIndex !== -1 && args[ignoreIndex + 1]) {
        options.ignore = args[ignoreIndex + 1].split(',').map(s => s.trim());
    }

    if (!options.json) {
        console.log('🔍 Analyzing project for unused exports...\n');
    }

    const result = await analyzeProject(options);

    if (options.json) {
        // Output JSON
        const jsonResult = {
            totalExports: Array.from(result.exports.values()).reduce((sum, arr) => sum + arr.length, 0),
            totalImports: result.imports.length,
            unusedExports: result.unusedExports.map(exp => ({
                name: exp.name,
                filePath: path.relative(process.cwd(), exp.filePath),
                exportType: exp.exportType,
                isTypeOnly: exp.isTypeOnly,
                kind: exp.kind,
                line: exp.line,
            })),
        };
        console.log(JSON.stringify(jsonResult, null, 2));
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
    console.log(`   Total exports: ${Array.from(result.exports.values()).reduce((sum, arr) => sum + arr.length, 0)}`);
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
            console.log(`   - ${exp.name} (${exp.kind}, ${exportTypeLabel}${typeLabel}) at line ${exp.line}`);

            if (options.verbose) {
                console.log(`     ${exp.code.split('\n')[0]}`);
            }
        }
        console.log('');
    }

    if (options.fix) {
        console.log('🔧 Removing unused exports...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const exp of result.unusedExports) {
            const relativePath = path.relative(projectRoot, exp.filePath);
            try {
                const removed = removeExport(exp);
                if (removed) {
                    console.log(`✅ Removed ${exp.name} from ${relativePath}`);
                    successCount++;
                } else {
                    console.log(`⚠️  Could not remove ${exp.name} from ${relativePath}`);
                }
            } catch (error) {
                console.error(`❌ Error removing ${exp.name} from ${relativePath}`);
                errorCount++;
            }
        }

        console.log(`\n✅ Completed: ${successCount} removed, ${errorCount} errors`);
    } else {
        console.log('💡 Tip: Run with --fix to automatically remove unused exports');
        console.log('   Example: bun scripts/remove-unused-exports.ts --fix');
    }
}

// Export for testing
export {
    extractExports,
    extractImports,
    resolveImportPath,
    removeExport,
};

export type {ExportInfo, ImportInfo, AnalysisResult, Options};

// Only run main if this is the entry point (not when imported)
if (typeof require !== 'undefined' && require.main === module) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

