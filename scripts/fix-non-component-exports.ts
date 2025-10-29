/**
 * Fix Non-Component Exports
 *
 * Analyzes the project to find files that mix React component exports with
 * non-component exports (types, utilities, constants, etc.).
 *
 * Generates a series of bash commands using the extract-definition script
 * to separate non-component exports into their own files.
 *
 * Usage:
 *   bun scripts/fix-non-component-exports.ts [--dry-run] [--execute] [--group-types] [--group-consts]
 *
 * Options:
 *   --dry-run       Show what would be extracted without generating commands (default)
 *   --execute       Actually run the extract-definition commands
 *   --group-types   Group types/interfaces/enums together into a single file per component file
 *   --group-consts  Group constants together into a single file per component file
 *
 * Examples:
 *   bun scripts/fix-non-component-exports.ts
 *   bun scripts/fix-non-component-exports.ts --group-types
 *   bun scripts/fix-non-component-exports.ts --group-consts
 *   bun scripts/fix-non-component-exports.ts --group-types --group-consts
 *   bun scripts/fix-non-component-exports.ts --group-types --group-consts --execute
 */

import * as parser from '@babel/parser';
import traverse, {NodePath} from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';
import {glob} from 'fast-glob';
import {execSync} from 'child_process';

interface ExportInfo {
    name: string;
    type: 'component' | 'non-component';
    kind: string; // 'function', 'class', 'const', 'type', 'interface', etc.
}

interface FileAnalysis {
    filePath: string;
    exports: ExportInfo[];
    hasComponents: boolean;
    hasNonComponents: boolean;
}

/**
 * Determines if a function declaration is likely a React component
 */
function isFunctionComponent(node: t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression, body?: string): boolean {
    // Check if function name starts with capital letter
    if (t.isFunctionDeclaration(node) && node.id) {
        const name = node.id.name;
        if (name[0] !== name[0].toUpperCase()) {
            return false;
        }
    }

    // Check if the function body contains JSX
    if (body) {
        // Look for JSX patterns in the body
        if (body.includes('<') && body.includes('/>') || body.includes('</')) {
            return true;
        }
    }

    let hasJSX = false;

    // Traverse the function body to look for JSX
    const checkForJSX = (node: t.Node) => {
        if (t.isJSXElement(node) || t.isJSXFragment(node)) {
            hasJSX = true;
        }
    };

    if (t.isFunctionDeclaration(node) && node.body) {
        traverse(t.file(t.program([node])), {
            JSXElement() {
                hasJSX = true;
            },
            JSXFragment() {
                hasJSX = true;
            },
        });
    }

    return hasJSX;
}

/**
 * Determines if a variable declaration is a React component
 */
function isComponentVariable(declarator: t.VariableDeclarator, name: string, code: string): boolean {
    // Must start with capital letter
    if (name[0] !== name[0].toUpperCase()) {
        return false;
    }

    // Check if it's a function (arrow function or function expression)
    if (t.isArrowFunctionExpression(declarator.init) || t.isFunctionExpression(declarator.init)) {
        // Extract the function body from the source code if possible
        if (declarator.init.loc) {
            const start = declarator.init.loc.start;
            const end = declarator.init.loc.end;
            const lines = code.split('\n');
            const bodyCode = lines.slice(start.line - 1, end.line).join('\n');

            if (bodyCode.includes('<') && (bodyCode.includes('/>') || bodyCode.includes('</'))) {
                return true;
            }
        }

        return isFunctionComponent(declarator.init);
    }

    return false;
}

/**
 * Analyzes a file to determine its exports
 */
function analyzeFile(filePath: string): FileAnalysis {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    const exports: ExportInfo[] = [];

    traverse(ast, {
        ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
            const declaration = nodePath.node.declaration;

            if (!declaration) {
                // export { foo, bar } from './somewhere'
                nodePath.node.specifiers.forEach((spec) => {
                    if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
                        const name = spec.exported.name;
                        // Without the actual declaration, assume non-component for lowercase
                        exports.push({
                            name,
                            type: name[0] === name[0].toUpperCase() ? 'component' : 'non-component',
                            kind: 'unknown',
                        });
                    }
                });
                return;
            }

            // Function declarations
            if (t.isFunctionDeclaration(declaration) && declaration.id) {
                const name = declaration.id.name;
                const isComponent = isFunctionComponent(declaration, code);
                exports.push({
                    name,
                    type: isComponent ? 'component' : 'non-component',
                    kind: 'function',
                });
            }

            // Class declarations
            else if (t.isClassDeclaration(declaration) && declaration.id) {
                const name = declaration.id.name;
                // Check if it extends React.Component or Component
                let isComponent = false;
                if (declaration.superClass) {
                    if (t.isIdentifier(declaration.superClass)) {
                        isComponent = declaration.superClass.name === 'Component' ||
                                     declaration.superClass.name === 'PureComponent';
                    } else if (t.isMemberExpression(declaration.superClass)) {
                        const obj = declaration.superClass.object;
                        const prop = declaration.superClass.property;
                        if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
                            isComponent = obj.name === 'React' &&
                                         (prop.name === 'Component' || prop.name === 'PureComponent');
                        }
                    }
                }
                exports.push({
                    name,
                    type: isComponent ? 'component' : 'non-component',
                    kind: 'class',
                });
            }

            // Variable declarations
            else if (t.isVariableDeclaration(declaration)) {
                declaration.declarations.forEach((declarator) => {
                    if (t.isIdentifier(declarator.id)) {
                        const name = declarator.id.name;
                        const isComponent = isComponentVariable(declarator, name, code);
                        exports.push({
                            name,
                            type: isComponent ? 'component' : 'non-component',
                            kind: declarator.init && (t.isArrowFunctionExpression(declarator.init) ||
                                                      t.isFunctionExpression(declarator.init))
                                ? 'function'
                                : 'const',
                        });
                    }
                });
            }

            // Type aliases
            else if (t.isTSTypeAliasDeclaration(declaration)) {
                exports.push({
                    name: declaration.id.name,
                    type: 'non-component',
                    kind: 'type',
                });
            }

            // Interfaces
            else if (t.isTSInterfaceDeclaration(declaration)) {
                exports.push({
                    name: declaration.id.name,
                    type: 'non-component',
                    kind: 'interface',
                });
            }

            // Enums
            else if (t.isTSEnumDeclaration(declaration)) {
                exports.push({
                    name: declaration.id.name,
                    type: 'non-component',
                    kind: 'enum',
                });
            }
        },

        ExportDefaultDeclaration(nodePath: NodePath<t.ExportDefaultDeclaration>) {
            const declaration = nodePath.node.declaration;

            // Default function
            if (t.isFunctionDeclaration(declaration)) {
                const name = declaration.id?.name || 'default';
                const isComponent = isFunctionComponent(declaration, code);
                exports.push({
                    name: 'default',
                    type: isComponent ? 'component' : 'non-component',
                    kind: 'function',
                });
            }

            // Default class
            else if (t.isClassDeclaration(declaration)) {
                const name = declaration.id?.name || 'default';
                let isComponent = false;
                if (declaration.superClass) {
                    if (t.isIdentifier(declaration.superClass)) {
                        isComponent = declaration.superClass.name === 'Component' ||
                                     declaration.superClass.name === 'PureComponent';
                    } else if (t.isMemberExpression(declaration.superClass)) {
                        const obj = declaration.superClass.object;
                        const prop = declaration.superClass.property;
                        if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
                            isComponent = obj.name === 'React' &&
                                         (prop.name === 'Component' || prop.name === 'PureComponent');
                        }
                    }
                }
                exports.push({
                    name: 'default',
                    type: isComponent ? 'component' : 'non-component',
                    kind: 'class',
                });
            }

            // Default arrow function or identifier
            else if (t.isIdentifier(declaration)) {
                const name = declaration.name;
                exports.push({
                    name: 'default',
                    type: name[0] === name[0].toUpperCase() ? 'component' : 'non-component',
                    kind: 'identifier',
                });
            }
        },
    });

    const hasComponents = exports.some(e => e.type === 'component');
    const hasNonComponents = exports.some(e => e.type === 'non-component');

    return {
        filePath,
        exports,
        hasComponents,
        hasNonComponents,
    };
}

/**
 * Generates a target file path for an extracted export
 */
function generateTargetPath(sourceFile: string, exportName: string, kind: string): string {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);

    // For types and interfaces, use .ts extension
    const targetExt = (kind === 'type' || kind === 'interface' || kind === 'enum') ? '.ts' : ext;

    return path.join(dir, `${exportName}${targetExt}`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const execute = args.includes('--execute');
    const groupTypes = args.includes('--group-types');
    const groupConsts = args.includes('--group-consts');
    const dryRun = !execute;

    console.log('🔍 Scanning project for files with mixed component/non-component exports...\n');

    // Find all TypeScript/TSX files
    const files = await glob(['src/**/*.{ts,tsx}'], {
        cwd: path.resolve(__dirname, '..'),
        absolute: true,
        ignore: [
            '**/node_modules/**',
            '**/build/**',
            '**/dist/**',
            '**/*.d.ts',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.vest.ts',
            '**/*.vest.tsx',
        ],
    });

    const problematicFiles: FileAnalysis[] = [];
    const commands: string[] = [];

    for (const file of files) {
        try {
            const analysis = analyzeFile(file);

            if (analysis.hasComponents && analysis.hasNonComponents) {
                problematicFiles.push(analysis);

                const relativePath = path.relative(process.cwd(), file);
                console.log(`📦 ${relativePath}`);
                console.log(`   Components: ${analysis.exports.filter(e => e.type === 'component').map(e => e.name).join(', ')}`);
                console.log(`   Non-components: ${analysis.exports.filter(e => e.type === 'non-component').map(e => `${e.name} (${e.kind})`).join(', ')}`);
                console.log('');

                // Generate extract commands for non-components
                const nonComponents = analysis.exports.filter(e => e.type === 'non-component' && e.name !== 'default');

                if (groupTypes || groupConsts) {
                    // Categorize exports
                    const typeExports = nonComponents.filter(e => e.kind === 'type' || e.kind === 'interface' || e.kind === 'enum');
                    const constExports = nonComponents.filter(e => e.kind === 'const');
                    const functionExports = nonComponents.filter(e => e.kind === 'function');
                    const otherExports = nonComponents.filter(e =>
                        e.kind !== 'type' &&
                        e.kind !== 'interface' &&
                        e.kind !== 'enum' &&
                        e.kind !== 'const' &&
                        e.kind !== 'function'
                    );

                    const dir = path.dirname(file);
                    const baseName = path.basename(file, path.extname(file));

                    // Extract types together if groupTypes is enabled
                    if (groupTypes && typeExports.length > 1) {
                        const targetPath = path.join(dir, `${baseName}.types.ts`);
                        const relativeTarget = path.relative(process.cwd(), targetPath);
                        const typeNames = typeExports.map(e => e.name).join(',');

                        const command = `pnpm extract-definition "${relativePath}" "${typeNames}" "${relativeTarget}"`;
                        commands.push(command);
                    } else if (groupTypes && typeExports.length === 1) {
                        // Single type - extract to its own file
                        const exp = typeExports[0];
                        const targetPath = generateTargetPath(file, exp.name, exp.kind);
                        const relativeTarget = path.relative(process.cwd(), targetPath);
                        const command = `pnpm extract-definition "${relativePath}" "${exp.name}" "${relativeTarget}"`;
                        commands.push(command);
                    } else {
                        // Not grouping types, extract individually
                        for (const exp of typeExports) {
                            const targetPath = generateTargetPath(file, exp.name, exp.kind);
                            const relativeTarget = path.relative(process.cwd(), targetPath);
                            const command = `pnpm extract-definition "${relativePath}" "${exp.name}" "${relativeTarget}"`;
                            commands.push(command);
                        }
                    }

                    // Extract consts together if groupConsts is enabled
                    if (groupConsts && constExports.length > 1) {
                        const targetPath = path.join(dir, `${baseName}.consts.ts`);
                        const relativeTarget = path.relative(process.cwd(), targetPath);
                        const constNames = constExports.map(e => e.name).join(',');

                        const command = `pnpm extract-definition "${relativePath}" "${constNames}" "${relativeTarget}"`;
                        commands.push(command);
                    } else if (groupConsts && constExports.length === 1) {
                        // Single const - extract to its own file
                        const exp = constExports[0];
                        const targetPath = generateTargetPath(file, exp.name, exp.kind);
                        const relativeTarget = path.relative(process.cwd(), targetPath);
                        const command = `pnpm extract-definition "${relativePath}" "${exp.name}" "${relativeTarget}"`;
                        commands.push(command);
                    } else {
                        // Not grouping consts, extract individually
                        for (const exp of constExports) {
                            const targetPath = generateTargetPath(file, exp.name, exp.kind);
                            const relativeTarget = path.relative(process.cwd(), targetPath);
                            const command = `pnpm extract-definition "${relativePath}" "${exp.name}" "${relativeTarget}"`;
                            commands.push(command);
                        }
                    }

                    // Extract functions and other exports individually
                    for (const exp of [...functionExports, ...otherExports]) {
                        const targetPath = generateTargetPath(file, exp.name, exp.kind);
                        const relativeTarget = path.relative(process.cwd(), targetPath);
                        const command = `pnpm extract-definition "${relativePath}" "${exp.name}" "${relativeTarget}"`;
                        commands.push(command);
                    }
                } else {
                    // Extract each non-component individually
                    for (const exp of nonComponents) {
                        const targetPath = generateTargetPath(file, exp.name, exp.kind);
                        const relativeTarget = path.relative(process.cwd(), targetPath);
                        const command = `pnpm extract-definition "${relativePath}" "${exp.name}" "${relativeTarget}"`;
                        commands.push(command);
                    }
                }
            }
        } catch (error: any) {
            console.error(`❌ Error analyzing ${file}: ${error.message}`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Found ${problematicFiles.length} files with mixed exports`);
    console.log(`   Generated ${commands.length} extraction commands\n`);

    if (commands.length === 0) {
        console.log('✅ No files need fixing! All component files are clean.');
        return;
    }

    if (dryRun) {
        console.log('🔧 Commands to run (use --execute to run them automatically):\n');
        console.log('#!/bin/bash\n');
        commands.forEach(cmd => console.log(cmd));
        console.log('\n💡 Tip: Save these commands to a file and review before executing:');
        console.log('   bun scripts/fix-non-component-exports.ts > fix-exports.sh');
        console.log('   # Review fix-exports.sh, then run it');
    } else {
        console.log('🚀 Executing commands...\n');
        let successCount = 0;
        let errorCount = 0;

        for (const command of commands) {
            try {
                console.log(`Running: ${command}`);
                execSync(command, { stdio: 'inherit', cwd: process.cwd() });
                successCount++;
            } catch (error) {
                console.error(`❌ Failed: ${command}`);
                errorCount++;
            }
        }

        console.log(`\n✅ Completed: ${successCount} successful, ${errorCount} failed`);
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

