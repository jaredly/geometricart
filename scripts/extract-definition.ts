/**
 * Extract TypeScript Definition / Move File
 *
 * A utility script for:
 * 1. Extracting a top-level definition from a TypeScript file into its own file
 * 2. Moving an entire TypeScript file to a new location
 *
 * Both operations automatically update all imports across the project.
 *
 * Usage:
 *   # Extract a specific definition
 *   pnpm extract-definition <source-file> <definition-name> <target-file>
 *
 *   # Move entire file
 *   pnpm extract-definition <source-file> <target-file>
 *
 * Examples:
 *   # Extract a function to its own file
 *   pnpm extract-definition src/utils.ts formatDate src/utils/formatDate.ts
 *
 *   # Extract a type
 *   pnpm extract-definition src/types.ts UserData src/types/UserData.ts
 *
 *   # Move entire file
 *   pnpm extract-definition src/utils/helpers.ts src/utils/string-helpers.ts
 *   pnpm extract-definition src/components/Button.tsx src/ui/Button.tsx
 *
 * Extract mode (3 args):
 *   1. Finds the specified definition in the source file
 *   2. Extracts it along with any required imports
 *   3. Creates a new file with the extracted definition
 *   4. Updates the source file to export from the new location
 *   5. Finds all files that import the definition and updates them to use the new path
 *
 * Move mode (2 args):
 *   1. Moves the entire file to the new location
 *   2. Finds all files that import from the old location
 *   3. Updates all imports to point to the new location
 *   4. Deletes the old file
 *
 * Supported definitions (extract mode):
 *   - Functions (exported and non-exported)
 *   - Classes
 *   - Type aliases
 *   - Interfaces
 *   - Enums
 *   - Constants and variables
 */

import * as parser from '@babel/parser';
import traverse, {NodePath} from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';
import {glob} from 'fast-glob';

interface ExtractOptions {
    sourceFile: string;
    definitionName: string;
    targetFile: string;
}

/**
 * Extracts a top-level definition from a TypeScript file into its own file
 * and updates all imports across the project.
 */
async function extractDefinition(options: ExtractOptions) {
    const {sourceFile, definitionName, targetFile} = options;

    // Read the source file
    const sourceCode = fs.readFileSync(sourceFile, 'utf-8');

    // Parse the source file
    const ast = parser.parse(sourceCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    // Find the definition and its dependencies
    let definitionNode: t.Node | null = null;
    let definitionStart = 0;
    let definitionEnd = 0;
    const usedImports = new Set<string>();
    const localDependencies = new Set<string>();

    // First pass: find the definition
    traverse(ast, {
        ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
            const declaration = nodePath.node.declaration;
            if (!declaration) return;

            const name = getDeclarationName(declaration);
            if (name === definitionName && nodePath.node.loc) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        ExportDefaultDeclaration(nodePath: NodePath<t.ExportDefaultDeclaration>) {
            if (definitionName === 'default' && nodePath.node.loc) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        FunctionDeclaration(nodePath: NodePath<t.FunctionDeclaration>) {
            if (nodePath.node.id?.name === definitionName && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        ClassDeclaration(nodePath: NodePath<t.ClassDeclaration>) {
            if (nodePath.node.id?.name === definitionName && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        VariableDeclaration(nodePath: NodePath<t.VariableDeclaration>) {
            const declarator = nodePath.node.declarations.find(
                (d: t.VariableDeclarator) => t.isIdentifier(d.id) && d.id.name === definitionName,
            );
            if (declarator && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        TSTypeAliasDeclaration(nodePath: NodePath<t.TSTypeAliasDeclaration>) {
            if (nodePath.node.id.name === definitionName && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        TSInterfaceDeclaration(nodePath: NodePath<t.TSInterfaceDeclaration>) {
            if (nodePath.node.id.name === definitionName && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
        TSEnumDeclaration(nodePath: NodePath<t.TSEnumDeclaration>) {
            if (nodePath.node.id.name === definitionName && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                definitionNode = nodePath.node;
                definitionStart = nodePath.node.loc.start.line;
                definitionEnd = nodePath.node.loc.end.line;
            }
        },
    });

    if (!definitionNode) {
        throw new Error(`Definition '${definitionName}' not found in ${sourceFile}`);
    }

    // Extract the definition code
    const lines = sourceCode.split('\n');
    const definitionCode = lines.slice(definitionStart - 1, definitionEnd).join('\n');

    // Second pass: find all identifiers used in the definition
    const definitionAst = parser.parse(definitionCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    traverse(definitionAst, {
        Identifier(nodePath: NodePath<t.Identifier>) {
            const name = nodePath.node.name;
            if (!t.isIdentifier(nodePath.node)) return;

            // Skip if it's a property key, a type parameter, or defined locally
            if (
                nodePath.key === 'key' ||
                nodePath.key === 'property' ||
                t.isObjectProperty(nodePath.parent) && nodePath.parent.key === nodePath.node
            ) {
                return;
            }

            localDependencies.add(name);
        },
        TSTypeReference(nodePath: NodePath<t.TSTypeReference>) {
            if (t.isIdentifier(nodePath.node.typeName)) {
                localDependencies.add(nodePath.node.typeName.name);
            }
        },
    });

    // Third pass: find imports that provide these dependencies
    const importMap = new Map<string, {source: string; specifiers: string[]}>();

    traverse(ast, {
        ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
            const source = nodePath.node.source.value;
            const specifiers: string[] = [];

            nodePath.node.specifiers.forEach((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                    const imported = spec.imported.name;
                    const local = spec.local.name;
                    specifiers.push(imported);
                    if (localDependencies.has(local)) {
                        usedImports.add(imported);
                    }
                } else if (t.isImportDefaultSpecifier(spec)) {
                    const local = spec.local.name;
                    specifiers.push('default');
                    if (localDependencies.has(local)) {
                        usedImports.add('default:' + local);
                    }
                } else if (t.isImportNamespaceSpecifier(spec)) {
                    const local = spec.local.name;
                    if (localDependencies.has(local)) {
                        usedImports.add('namespace:' + local);
                    }
                }
            });

            if (specifiers.length > 0) {
                importMap.set(source, {source, specifiers});
            }
        },
    });

    // Build the necessary imports for the new file
    const necessaryImports: string[] = [];

    traverse(ast, {
        ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
            const source = nodePath.node.source.value;
            const neededSpecifiers: string[] = [];

            nodePath.node.specifiers.forEach((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                    const imported = spec.imported.name;
                    const local = spec.local.name;
                    if (localDependencies.has(local)) {
                        if (imported === local) {
                            neededSpecifiers.push(imported);
                        } else {
                            neededSpecifiers.push(`${imported} as ${local}`);
                        }
                    }
                } else if (t.isImportDefaultSpecifier(spec)) {
                    const local = spec.local.name;
                    if (localDependencies.has(local)) {
                        necessaryImports.push(`import ${local} from '${source}';`);
                    }
                } else if (t.isImportNamespaceSpecifier(spec)) {
                    const local = spec.local.name;
                    if (localDependencies.has(local)) {
                        necessaryImports.push(`import * as ${local} from '${source}';`);
                    }
                }
            });

            if (neededSpecifiers.length > 0) {
                necessaryImports.push(`import {${neededSpecifiers.join(', ')}} from '${source}';`);
            }
        },
    });

    // Create the new file
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
    }

    const newFileContent = [
        ...necessaryImports,
        '',
        definitionCode,
    ].join('\n');

    fs.writeFileSync(targetFile, newFileContent, 'utf-8');
    console.log(`✓ Created ${targetFile}`);

    // Update the source file
    const isExported = definitionCode.startsWith('export');
    const relativeImport = getRelativeImportPath(sourceFile, targetFile);

    let updatedSourceCode: string;
    if (isExported) {
        // Replace the definition with an export statement
        updatedSourceCode = [
            ...lines.slice(0, definitionStart - 1),
            `export {${definitionName}} from '${relativeImport}';`,
            ...lines.slice(definitionEnd),
        ].join('\n');
    } else {
        // Just remove the definition and add an import
        const importStatement = `import {${definitionName}} from '${relativeImport}';`;
        const importsEndIndex = findLastImportLine(lines);

        updatedSourceCode = [
            ...lines.slice(0, importsEndIndex),
            importStatement,
            ...lines.slice(importsEndIndex, definitionStart - 1),
            ...lines.slice(definitionEnd),
        ].join('\n');
    }

    fs.writeFileSync(sourceFile, updatedSourceCode, 'utf-8');
    console.log(`✓ Updated ${sourceFile}`);

    // Find and update all imports across the project
    await updateAllImports(sourceFile, targetFile, definitionName);
}

function getDeclarationName(declaration: t.Declaration): string | null {
    if (t.isFunctionDeclaration(declaration) || t.isClassDeclaration(declaration)) {
        return declaration.id?.name || null;
    }
    if (t.isVariableDeclaration(declaration)) {
        const declarator = declaration.declarations[0];
        if (t.isIdentifier(declarator.id)) {
            return declarator.id.name;
        }
    }
    if (t.isTSTypeAliasDeclaration(declaration) || t.isTSInterfaceDeclaration(declaration)) {
        return declaration.id.name;
    }
    if (t.isTSEnumDeclaration(declaration)) {
        return declaration.id.name;
    }
    return null;
}

function getRelativeImportPath(from: string, to: string): string {
    const relative = path.relative(path.dirname(from), to);
    const withoutExt = relative.replace(/\.tsx?$/, '');
    return withoutExt.startsWith('.') ? withoutExt : `./${withoutExt}`;
}

function findLastImportLine(lines: string[]): number {
    let lastImportLine = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('import ') || line.startsWith('export ') && line.includes(' from ')) {
            lastImportLine = i + 1;
        } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
            break;
        }
    }
    return lastImportLine;
}

async function updateAllImports(oldFile: string, newFile: string, definitionName: string) {
    // Find all TypeScript files in the project
    const files = await glob(['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'], {
        cwd: path.resolve(__dirname, '..'),
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**', '**/dist/**'],
    });

    const oldFileRelative = path.relative(process.cwd(), oldFile);
    let updatedCount = 0;

    for (const file of files) {
        if (file === oldFile || file === newFile) continue;

        const code = fs.readFileSync(file, 'utf-8');
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let needsUpdate = false;
        const importToUpdate: {
            node: t.ImportDeclaration;
            specifiers: string[];
        }[] = [];

        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
                const source = nodePath.node.source.value;
                const resolvedSource = resolveImportPath(file, source);
                const resolvedOldFile = path.resolve(oldFile);

                if (resolvedSource === resolvedOldFile ||
                    resolvedSource === resolvedOldFile.replace(/\.tsx?$/, '')) {
                    // Check if this import includes our definition
                    const hasDefinition = nodePath.node.specifiers.some((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                        if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                            return spec.imported.name === definitionName;
                        }
                        if (t.isImportDefaultSpecifier(spec) && definitionName === 'default') {
                            return true;
                        }
                        return false;
                    });

                    if (hasDefinition) {
                        needsUpdate = true;
                        const specifierNames = nodePath.node.specifiers
                            .filter((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                                if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                                    return spec.imported.name === definitionName;
                                }
                                if (t.isImportDefaultSpecifier(spec) && definitionName === 'default') {
                                    return true;
                                }
                                return false;
                            })
                            .map((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                                if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                                    return spec.imported.name;
                                }
                                return 'default';
                            });

                        importToUpdate.push({
                            node: nodePath.node,
                            specifiers: specifierNames,
                        });
                    }
                }
            },
        });

        if (needsUpdate) {
            let updatedCode = code;
            const lines = code.split('\n');

            for (const {node} of importToUpdate) {
                if (!node.loc) continue;

                const oldImportLine = lines.slice(node.loc.start.line - 1, node.loc.end.line).join('\n');
                const otherSpecifiers = node.specifiers.filter((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                    if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                        return spec.imported.name !== definitionName;
                    }
                    if (t.isImportDefaultSpecifier(spec) && definitionName === 'default') {
                        return false;
                    }
                    return true;
                });

                const newImportPath = getRelativeImportPath(file, newFile);
                const newImportLine = `import {${definitionName}} from '${newImportPath}';`;

                if (otherSpecifiers.length === 0) {
                    // Replace the entire import
                    updatedCode = updatedCode.replace(oldImportLine, newImportLine);
                } else {
                    // Keep the old import but remove the definition, add new import
                    const otherSpecifierNames = otherSpecifiers
                        .map((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                            if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                                const imported = spec.imported.name;
                                const local = spec.local.name;
                                return imported === local ? imported : `${imported} as ${local}`;
                            }
                            if (t.isImportDefaultSpecifier(spec)) {
                                return spec.local.name;
                            }
                            if (t.isImportNamespaceSpecifier(spec)) {
                                return `* as ${spec.local.name}`;
                            }
                            return '';
                        })
                        .filter(Boolean);

                    const updatedOldImport = `import {${otherSpecifierNames.join(', ')}} from '${node.source.value}';`;
                    updatedCode = updatedCode.replace(oldImportLine, `${updatedOldImport}\n${newImportLine}`);
                }
            }

            fs.writeFileSync(file, updatedCode, 'utf-8');
            updatedCount++;
            console.log(`✓ Updated imports in ${path.relative(process.cwd(), file)}`);
        }
    }

    console.log(`\n✓ Updated ${updatedCount} file(s)`);
}

function resolveImportPath(from: string, importPath: string): string {
    if (importPath.startsWith('.')) {
        const resolved = path.resolve(path.dirname(from), importPath);
        // Try with extensions
        for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
            const withExt = resolved + ext;
            if (fs.existsSync(withExt)) {
                return withExt;
            }
        }
        return resolved;
    }
    return importPath;
}

/**
 * Moves an entire file to a new location and updates all imports across the project.
 */
async function moveFile(sourceFile: string, targetFile: string) {
    if (!fs.existsSync(sourceFile)) {
        throw new Error(`Source file not found: ${sourceFile}`);
    }

    // Read the source file
    const sourceCode = fs.readFileSync(sourceFile, 'utf-8');

    // Create the target directory if it doesn't exist
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
    }

    // Write to the new location
    fs.writeFileSync(targetFile, sourceCode, 'utf-8');
    console.log(`✓ Created ${targetFile}`);

    // Find and update all imports across the project
    const files = await glob(['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'], {
        cwd: path.resolve(__dirname, '..'),
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**', '**/dist/**'],
    });

    const resolvedOldFile = path.resolve(sourceFile);
    let updatedCount = 0;

    for (const file of files) {
        if (file === sourceFile || file === targetFile) continue;

        const code = fs.readFileSync(file, 'utf-8');
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let needsUpdate = false;
        const importsToUpdate: {
            node: t.ImportDeclaration | t.ExportNamedDeclaration | t.ExportAllDeclaration;
            line: string;
        }[] = [];

        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
                const source = nodePath.node.source.value;
                const resolvedSource = resolveImportPath(file, source);

                if (resolvedSource === resolvedOldFile ||
                    resolvedSource === resolvedOldFile.replace(/\.tsx?$/, '')) {
                    needsUpdate = true;
                    if (nodePath.node.loc) {
                        const lines = code.split('\n');
                        const importLine = lines.slice(nodePath.node.loc.start.line - 1, nodePath.node.loc.end.line).join('\n');
                        importsToUpdate.push({
                            node: nodePath.node,
                            line: importLine,
                        });
                    }
                }
            },
            ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
                if (nodePath.node.source) {
                    const source = nodePath.node.source.value;
                    const resolvedSource = resolveImportPath(file, source);

                    if (resolvedSource === resolvedOldFile ||
                        resolvedSource === resolvedOldFile.replace(/\.tsx?$/, '')) {
                        needsUpdate = true;
                        if (nodePath.node.loc) {
                            const lines = code.split('\n');
                            const exportLine = lines.slice(nodePath.node.loc.start.line - 1, nodePath.node.loc.end.line).join('\n');
                            importsToUpdate.push({
                                node: nodePath.node,
                                line: exportLine,
                            });
                        }
                    }
                }
            },
            ExportAllDeclaration(nodePath: NodePath<t.ExportAllDeclaration>) {
                const source = nodePath.node.source.value;
                const resolvedSource = resolveImportPath(file, source);

                if (resolvedSource === resolvedOldFile ||
                    resolvedSource === resolvedOldFile.replace(/\.tsx?$/, '')) {
                    needsUpdate = true;
                    if (nodePath.node.loc) {
                        const lines = code.split('\n');
                        const exportLine = lines.slice(nodePath.node.loc.start.line - 1, nodePath.node.loc.end.line).join('\n');
                        importsToUpdate.push({
                            node: nodePath.node,
                            line: exportLine,
                        });
                    }
                }
            },
        });

        if (needsUpdate) {
            let updatedCode = code;
            const newImportPath = getRelativeImportPath(file, targetFile);

            for (const {node, line} of importsToUpdate) {
                const newLine = line.replace(
                    new RegExp(`(['"])${escapeRegex(node.source!.value)}\\1`, 'g'),
                    `$1${newImportPath}$1`
                );
                updatedCode = updatedCode.replace(line, newLine);
            }

            fs.writeFileSync(file, updatedCode, 'utf-8');
            updatedCount++;
            console.log(`✓ Updated imports in ${path.relative(process.cwd(), file)}`);
        }
    }

    // Delete the old file
    fs.unlinkSync(sourceFile);
    console.log(`✓ Deleted ${sourceFile}`);

    console.log(`\n✓ Moved file and updated ${updatedCount} file(s)`);
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage:');
    console.error('  Extract definition: node extract-definition.ts <source-file> <definition-name> <target-file>');
    console.error('  Move file:          node extract-definition.ts <source-file> <target-file>');
    console.error('');
    console.error('Examples:');
    console.error('  Extract: node extract-definition.ts src/utils/helpers.ts formatDate src/utils/formatDate.ts');
    console.error('  Move:    node extract-definition.ts src/utils/helpers.ts src/utils/string-helpers.ts');
    process.exit(1);
}

if (args.length === 2) {
    // Move file mode
    const [sourceFile, targetFile] = args;
    moveFile(path.resolve(sourceFile), path.resolve(targetFile)).catch((error) => {
        console.error('Error:', error.message);
        process.exit(1);
    });
} else if (args.length === 3) {
    // Extract definition mode
    const [sourceFile, definitionName, targetFile] = args;
    extractDefinition({
        sourceFile: path.resolve(sourceFile),
        definitionName,
        targetFile: path.resolve(targetFile),
    }).catch((error) => {
        console.error('Error:', error.message);
        process.exit(1);
    });
} else {
    console.error('Error: Too many arguments provided.');
    console.error('');
    console.error('Usage:');
    console.error('  Extract definition: node extract-definition.ts <source-file> <definition-name> <target-file>');
    console.error('  Move file:          node extract-definition.ts <source-file> <target-file>');
    process.exit(1);
}

