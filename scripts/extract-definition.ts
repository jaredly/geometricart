/**
 * Extract TypeScript Definition / Move File
 *
 * A utility script for:
 * 1. Extracting one or more top-level definitions from a TypeScript file into a new file
 * 2. Moving an entire TypeScript file to a new location
 *
 * Both operations automatically update all imports across the project.
 *
 * Usage:
 *   # Extract single definition
 *   pnpm extract-definition <source-file> <definition-name> <target-file>
 *
 *   # Extract multiple definitions (comma-separated, no spaces)
 *   pnpm extract-definition <source-file> <def1,def2,def3> <target-file>
 *
 *   # Move entire file
 *   pnpm extract-definition <source-file> <target-file>
 *
 * Examples:
 *   # Extract a single function
 *   pnpm extract-definition src/utils.ts formatDate src/utils/formatDate.ts
 *
 *   # Extract multiple related utilities to one file
 *   pnpm extract-definition src/utils.ts "formatDate,parseDate,isValidDate" src/utils/dates.ts
 *
 *   # Extract multiple types to one file
 *   pnpm extract-definition src/types.ts "User,UserRole,UserPermissions" src/types/user.ts
 *
 *   # Move entire file
 *   pnpm extract-definition src/utils/helpers.ts src/utils/string-helpers.ts
 *
 * Extract mode (3 args):
 *   1. Finds the specified definition(s) in the source file
 *   2. Extracts them along with any required imports
 *   3. Creates a new file with the extracted definitions
 *   4. Updates the source file to export from the new location
 *   5. Finds all files that import the definitions and updates them to use the new path
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
    definitionNames: string[];
    targetFile: string;
}

interface DefinitionInfo {
    name: string;
    node: t.Node;
    start: number;
    end: number;
    code: string;
}

/**
 * Extracts one or more top-level definitions from a TypeScript file into a new file
 * and updates all imports across the project.
 */
async function extractDefinition(options: ExtractOptions) {
    let {sourceFile, definitionNames, targetFile} = options;

    // Read the source file
    const sourceCode = fs.readFileSync(sourceFile, 'utf-8');
    const lines = sourceCode.split('\n');

    // Parse the source file
    const ast = parser.parse(sourceCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    // Find all the requested definitions
    const definitions: DefinitionInfo[] = [];
    const definitionNamesSet = new Set(definitionNames);

    // First pass: find all definitions
    traverse(ast, {
        ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
            const declaration = nodePath.node.declaration;
            if (!declaration) return;

            const name = getDeclarationName(declaration);
            if (name && definitionNamesSet.has(name) && nodePath.node.loc) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name,
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
        ExportDefaultDeclaration(nodePath: NodePath<t.ExportDefaultDeclaration>) {
            if (definitionNamesSet.has('default') && nodePath.node.loc) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name: 'default',
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
        FunctionDeclaration(nodePath: NodePath<t.FunctionDeclaration>) {
            const name = nodePath.node.id?.name;
            if (name && definitionNamesSet.has(name) && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name,
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
        ClassDeclaration(nodePath: NodePath<t.ClassDeclaration>) {
            const name = nodePath.node.id?.name;
            if (name && definitionNamesSet.has(name) && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name,
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
        VariableDeclaration(nodePath: NodePath<t.VariableDeclaration>) {
            nodePath.node.declarations.forEach((d: t.VariableDeclarator) => {
                if (t.isIdentifier(d.id) && definitionNamesSet.has(d.id.name)) {
                    if (nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                        const start = nodePath.node.loc.start.line;
                        const end = nodePath.node.loc.end.line;
                        definitions.push({
                            name: d.id.name,
                            node: nodePath.node,
                            start,
                            end,
                            code: lines.slice(start - 1, end).join('\n'),
                        });
                    }
                }
            });
        },
        TSTypeAliasDeclaration(nodePath: NodePath<t.TSTypeAliasDeclaration>) {
            const name = nodePath.node.id.name;
            if (definitionNamesSet.has(name) && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name,
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
        TSInterfaceDeclaration(nodePath: NodePath<t.TSInterfaceDeclaration>) {
            const name = nodePath.node.id.name;
            if (definitionNamesSet.has(name) && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name,
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
        TSEnumDeclaration(nodePath: NodePath<t.TSEnumDeclaration>) {
            const name = nodePath.node.id.name;
            if (definitionNamesSet.has(name) && nodePath.node.loc && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                const start = nodePath.node.loc.start.line;
                const end = nodePath.node.loc.end.line;
                definitions.push({
                    name,
                    node: nodePath.node,
                    start,
                    end,
                    code: lines.slice(start - 1, end).join('\n'),
                });
            }
        },
    });

    // Check that all definitions were found
    const foundNames = new Set(definitions.map(d => d.name));
    const missing = definitionNames.filter(name => !foundNames.has(name));
    if (missing.length > 0) {
        throw new Error(`Definitions not found in ${sourceFile}: ${missing.join(', ')}`);
    }

    console.log(`✓ Found ${definitions.length} definition(s)`);

    // Combine all definition code
    const allDefinitionCode = definitions.map(d => d.code).join('\n\n');
    const localDependencies = new Set<string>();

    // Second pass: find all identifiers used in all the definitions
    const definitionsAst = parser.parse(allDefinitionCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    // Check if the code contains JSX
    let hasJSX = false;
    traverse(definitionsAst, {
        JSXElement() {
            hasJSX = true;
        },
        JSXFragment() {
            hasJSX = true;
        },
    });

    // If code has JSX but target file ends with .ts, change to .tsx
    if (hasJSX && targetFile.endsWith('.ts')) {
        const newTargetFile = targetFile.replace(/\.ts$/, '.tsx');
        console.log(`⚠️  Extracted code contains JSX, changing extension: ${path.basename(targetFile)} → ${path.basename(newTargetFile)}`);
        targetFile = newTargetFile;
    }

    traverse(definitionsAst, {
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

            // Skip if it's a function parameter or a locally bound variable
            const binding = nodePath.scope.getBinding(name);
            if (binding && binding.scope !== nodePath.scope.getProgramParent()) {
                // This identifier is bound locally within the extracted code (e.g., a parameter or local variable)
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

    // Third pass: build the necessary imports for the new file
    const necessaryImports: string[] = [];

    traverse(ast, {
        ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
            const source = nodePath.node.source.value;
            const neededSpecifiers: string[] = [];
            const isTypeImport = nodePath.node.importKind === 'type';

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
                        const typeKeyword = isTypeImport ? 'type ' : '';
                        necessaryImports.push(`import ${typeKeyword}${local} from '${source}';`);
                    }
                } else if (t.isImportNamespaceSpecifier(spec)) {
                    const local = spec.local.name;
                    if (localDependencies.has(local)) {
                        const typeKeyword = isTypeImport ? 'type ' : '';
                        necessaryImports.push(`import ${typeKeyword}* as ${local} from '${source}';`);
                    }
                }
            });

            if (neededSpecifiers.length > 0) {
                const typeKeyword = isTypeImport ? 'type ' : '';
                necessaryImports.push(`import ${typeKeyword}{${neededSpecifiers.join(', ')}} from '${source}';`);
            }
        },
    });

    // Create the new file
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
    }
    if (fs.existsSync(targetFile)) {
        throw new Error(`existing files exists already`);
    }

    const newFileContent = [
        ...necessaryImports,
        '',
        allDefinitionCode,
    ].join('\n');

    fs.writeFileSync(targetFile, newFileContent, 'utf-8');
    console.log(`✓ Created ${targetFile}`);

    // Find all definitions in the source file (to detect same-file dependencies)
    const allSourceDefinitions = new Set<string>();
    traverse(ast, {
        ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
            const name = nodePath.node.declaration && getDeclarationName(nodePath.node.declaration);
            if (name) allSourceDefinitions.add(name);
        },
        FunctionDeclaration(nodePath: NodePath<t.FunctionDeclaration>) {
            if (nodePath.node.id?.name && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                allSourceDefinitions.add(nodePath.node.id.name);
            }
        },
        ClassDeclaration(nodePath: NodePath<t.ClassDeclaration>) {
            if (nodePath.node.id?.name && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                allSourceDefinitions.add(nodePath.node.id.name);
            }
        },
        VariableDeclaration(nodePath: NodePath<t.VariableDeclaration>) {
            nodePath.node.declarations.forEach((d: t.VariableDeclarator) => {
                if (t.isIdentifier(d.id) && (!nodePath.parent || t.isProgram(nodePath.parent))) {
                    allSourceDefinitions.add(d.id.name);
                }
            });
        },
        TSTypeAliasDeclaration(nodePath: NodePath<t.TSTypeAliasDeclaration>) {
            if (!nodePath.parent || t.isProgram(nodePath.parent)) {
                allSourceDefinitions.add(nodePath.node.id.name);
            }
        },
        TSInterfaceDeclaration(nodePath: NodePath<t.TSInterfaceDeclaration>) {
            if (!nodePath.parent || t.isProgram(nodePath.parent)) {
                allSourceDefinitions.add(nodePath.node.id.name);
            }
        },
        TSEnumDeclaration(nodePath: NodePath<t.TSEnumDeclaration>) {
            if (!nodePath.parent || t.isProgram(nodePath.parent)) {
                allSourceDefinitions.add(nodePath.node.id.name);
            }
        },
    });

    // Check if extracted definitions depend on other definitions in the same file
    const sameFileDependencies = Array.from(localDependencies).filter(dep =>
        allSourceDefinitions.has(dep) && !definitionNamesSet.has(dep)
    );

    // Check which dependencies are NOT exported
    const exportedNames = new Set<string>();
    traverse(ast, {
        ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
            const name = nodePath.node.declaration && getDeclarationName(nodePath.node.declaration);
            if (name) exportedNames.add(name);

            // Also check for export { a, b } syntax
            nodePath.node.specifiers.forEach(spec => {
                if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
                    exportedNames.add(spec.exported.name);
                }
            });
        },
    });

    const needsExport = sameFileDependencies.filter(dep => !exportedNames.has(dep));

    if (sameFileDependencies.length > 0) {
        console.log(`⚠️  Warning: Extracted definitions depend on: ${sameFileDependencies.join(', ')}`);

        if (needsExport.length > 0) {
            console.log(`   These are not exported: ${needsExport.join(', ')}`);
            console.log(`   Will add exports for them in the source file.`);
        }

        // Add imports for same-file dependencies to the new file
        const sourceRelativeImport = getRelativeImportPath(targetFile, sourceFile);
        necessaryImports.unshift(`import {${sameFileDependencies.join(', ')}} from '${sourceRelativeImport}';`);

        // Recreate the new file with updated imports
        const updatedNewFileContent = [
            ...necessaryImports,
            '',
            allDefinitionCode,
        ].join('\n');

        fs.writeFileSync(targetFile, updatedNewFileContent, 'utf-8');
    }

    // Update the source file - just remove the extracted definitions (no re-exports!)
    const relativeImport = getRelativeImportPath(sourceFile, targetFile);
    const sortedDefinitions = [...definitions].sort((a, b) => b.start - a.start);

    // Remove definitions from source file (in reverse order to maintain line numbers)
    let updatedLines = [...lines];
    for (const def of sortedDefinitions) {
        updatedLines.splice(def.start - 1, def.end - def.start + 1);
    }

    // Check if the source file still uses any of the extracted definitions
    const remainingCode = updatedLines.join('\n');
    const stillUsed = definitionNames.filter(name => {
        // Simple check using regex
        const regex = new RegExp(`\\b${name}\\b`);
        return regex.test(remainingCode);
    });

    // Add imports ONLY if definitions are still used in the source file
    if (stillUsed.length > 0) {
        console.log(`   Source file still uses: ${stillUsed.join(', ')} - adding import`);
        const importStatement = `import {${stillUsed.join(', ')}} from '${relativeImport}';`;
        const importsEndIndex = findLastImportLine(updatedLines);
        updatedLines.splice(importsEndIndex + 1, 0, importStatement);
    }

    // Export dependencies that need to be exported
    if (needsExport.length > 0) {
        // Parse the updated source code to find where dependencies are defined
        const updatedSourceCode = updatedLines.join('\n');
        const updatedAst = parser.parse(updatedSourceCode, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const dependencyDefinitions: {name: string; start: number; end: number}[] = [];

        traverse(updatedAst, {
            FunctionDeclaration(nodePath: NodePath<t.FunctionDeclaration>) {
                const name = nodePath.node.id?.name;
                // Only export top-level declarations (parent is Program)
                if (name && needsExport.includes(name) && nodePath.node.loc && t.isProgram(nodePath.parent)) {
                    dependencyDefinitions.push({
                        name,
                        start: nodePath.node.loc.start.line,
                        end: nodePath.node.loc.end.line,
                    });
                }
            },
            VariableDeclaration(nodePath: NodePath<t.VariableDeclaration>) {
                // Only export top-level declarations (parent is Program)
                if (!t.isProgram(nodePath.parent)) {
                    return;
                }

                nodePath.node.declarations.forEach((d: t.VariableDeclarator) => {
                    if (t.isIdentifier(d.id) && needsExport.includes(d.id.name)) {
                        if (nodePath.node.loc) {
                            dependencyDefinitions.push({
                                name: d.id.name,
                                start: nodePath.node.loc.start.line,
                                end: nodePath.node.loc.end.line,
                            });
                        }
                    }
                });
            },
            ClassDeclaration(nodePath: NodePath<t.ClassDeclaration>) {
                const name = nodePath.node.id?.name;
                // Only export top-level declarations (parent is Program)
                if (name && needsExport.includes(name) && nodePath.node.loc && t.isProgram(nodePath.parent)) {
                    dependencyDefinitions.push({
                        name,
                        start: nodePath.node.loc.start.line,
                        end: nodePath.node.loc.end.line,
                    });
                }
            },
            TSTypeAliasDeclaration(nodePath: NodePath<t.TSTypeAliasDeclaration>) {
                const name = nodePath.node.id.name;
                // Only export top-level declarations (parent is Program)
                if (needsExport.includes(name) && nodePath.node.loc && t.isProgram(nodePath.parent)) {
                    dependencyDefinitions.push({
                        name,
                        start: nodePath.node.loc.start.line,
                        end: nodePath.node.loc.end.line,
                    });
                }
            },
            TSInterfaceDeclaration(nodePath: NodePath<t.TSInterfaceDeclaration>) {
                const name = nodePath.node.id.name;
                // Only export top-level declarations (parent is Program)
                if (needsExport.includes(name) && nodePath.node.loc && t.isProgram(nodePath.parent)) {
                    dependencyDefinitions.push({
                        name,
                        start: nodePath.node.loc.start.line,
                        end: nodePath.node.loc.end.line,
                    });
                }
            },
            TSEnumDeclaration(nodePath: NodePath<t.TSEnumDeclaration>) {
                const name = nodePath.node.id.name;
                // Only export top-level declarations (parent is Program)
                if (needsExport.includes(name) && nodePath.node.loc && t.isProgram(nodePath.parent)) {
                    dependencyDefinitions.push({
                        name,
                        start: nodePath.node.loc.start.line,
                        end: nodePath.node.loc.end.line,
                    });
                }
            },
        });

        // Add export keyword to each dependency definition
        // Sort in reverse order to maintain line numbers
        dependencyDefinitions.sort((a, b) => b.start - a.start);

        for (const dep of dependencyDefinitions) {
            const lineIndex = dep.start - 1;
            const line = updatedLines[lineIndex];

            // Add 'export ' at the beginning of the line if it doesn't already have it
            if (!line.trim().startsWith('export ')) {
                updatedLines[lineIndex] = line.replace(/^(\s*)/, '$1export ');
            }
        }
    }

    fs.writeFileSync(sourceFile, updatedLines.join('\n'), 'utf-8');
    console.log(`✓ Updated ${sourceFile}`);

    // Find and update all imports across the project
    await updateAllImports(sourceFile, targetFile, definitionNames);
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
    const code = lines.join('\n');
    try {
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let lastImportLine = 0;
        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<t.ImportDeclaration>) {
                if (nodePath.node.loc) {
                    lastImportLine = Math.max(lastImportLine, nodePath.node.loc.end.line - 1);
                }
            },
            ExportNamedDeclaration(nodePath: NodePath<t.ExportNamedDeclaration>) {
                // Also consider export ... from statements
                if (nodePath.node.source && nodePath.node.loc) {
                    lastImportLine = Math.max(lastImportLine, nodePath.node.loc.end.line - 1);
                }
            },
            ExportAllDeclaration(nodePath: NodePath<t.ExportAllDeclaration>) {
                if (nodePath.node.loc) {
                    lastImportLine = Math.max(lastImportLine, nodePath.node.loc.end.line - 1);
                }
            },
        });
        return lastImportLine;
    } catch (err) {
        // Fallback to simple line-by-line parsing if AST parsing fails
        let lastImportLine = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('import ') || line.startsWith('export ') && line.includes(' from ')) {
                lastImportLine = i;
            } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
                break;
            }
        }
        return lastImportLine;
    }
}

async function updateAllImports(oldFile: string, newFile: string, definitionNames: string[]) {
    // Find all TypeScript files in the project
    const files = await glob(['**/*.{ts,tsx}'], {
        cwd: path.resolve(__dirname, '..'),
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/*.d.ts'],
    });

    const definitionNamesSet = new Set(definitionNames);
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

                // Normalize both paths by removing extensions for comparison
                const normalizedSource = resolvedSource.replace(/\.tsx?$/, '');
                const normalizedOldFile = resolvedOldFile.replace(/\.tsx?$/, '');

                if (normalizedSource === normalizedOldFile) {
                    // Check if this import includes any of our definitions
                    const hasDefinition = nodePath.node.specifiers.some((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                        if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                            return definitionNamesSet.has(spec.imported.name);
                        }
                        if (t.isImportDefaultSpecifier(spec) && definitionNamesSet.has('default')) {
                            return true;
                        }
                        return false;
                    });

                    if (hasDefinition) {
                        needsUpdate = true;
                        const specifierNames = nodePath.node.specifiers
                            .filter((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                                if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                                    return definitionNamesSet.has(spec.imported.name);
                                }
                                if (t.isImportDefaultSpecifier(spec) && definitionNamesSet.has('default')) {
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

            for (const {node, specifiers} of importToUpdate) {
                if (!node.loc) continue;

                const oldImportLine = lines.slice(node.loc.start.line - 1, node.loc.end.line).join('\n');
                const otherSpecifiers = node.specifiers.filter((spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
                    if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
                        return !definitionNamesSet.has(spec.imported.name);
                    }
                    if (t.isImportDefaultSpecifier(spec) && definitionNamesSet.has('default')) {
                        return false;
                    }
                    return true;
                });

                const newImportPath = getRelativeImportPath(file, newFile);
                const newImportLine = `import {${specifiers.filter(s => s !== 'default').join(', ')}} from '${newImportPath}';`;

                if (otherSpecifiers.length === 0) {
                    // Replace the entire import
                    updatedCode = updatedCode.replace(oldImportLine, newImportLine);
                } else {
                    // Keep the old import but remove the extracted definitions, add new import
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
    const files = await glob(['**/*.{ts,tsx}'], {
        cwd: path.resolve(__dirname, '..'),
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/*.d.ts'],
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

                // Normalize both paths by removing extensions for comparison
                const normalizedSource = resolvedSource.replace(/\.tsx?$/, '');
                const normalizedOldFile = resolvedOldFile.replace(/\.tsx?$/, '');

                if (normalizedSource === normalizedOldFile) {
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

                    // Normalize both paths by removing extensions for comparison
                    const normalizedSource = resolvedSource.replace(/\.tsx?$/, '');
                    const normalizedOldFile = resolvedOldFile.replace(/\.tsx?$/, '');

                    if (normalizedSource === normalizedOldFile) {
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

                // Normalize both paths by removing extensions for comparison
                const normalizedSource = resolvedSource.replace(/\.tsx?$/, '');
                const normalizedOldFile = resolvedOldFile.replace(/\.tsx?$/, '');

                if (normalizedSource === normalizedOldFile) {
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
    console.error('  Extract single:     node extract-definition.ts <source-file> <definition-name> <target-file>');
    console.error('  Extract multiple:   node extract-definition.ts <source-file> <name1,name2,name3> <target-file>');
    console.error('  Move file:          node extract-definition.ts <source-file> <target-file>');
    console.error('');
    console.error('Examples:');
    console.error('  Extract single:   node extract-definition.ts src/utils/helpers.ts formatDate src/utils/formatDate.ts');
    console.error('  Extract multiple: node extract-definition.ts src/utils.ts "formatDate,parseDate" src/utils/dates.ts');
    console.error('  Move:             node extract-definition.ts src/utils/helpers.ts src/utils/string-helpers.ts');
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
    // Extract definition mode (single or multiple)
    const [sourceFile, definitionNamesArg, targetFile] = args;

    // Parse comma-separated names
    const definitionNames = definitionNamesArg.split(',').map(name => name.trim()).filter(Boolean);

    if (definitionNames.length === 0) {
        console.error('Error: No definition names provided.');
        process.exit(1);
    }

    extractDefinition({
        sourceFile: path.resolve(sourceFile),
        definitionNames,
        targetFile: path.resolve(targetFile),
    }).catch((error) => {
        console.error('Error:', error.message);
        process.exit(1);
    });
} else {
    console.error('Error: Too many arguments provided.');
    console.error('');
    console.error('Usage:');
    console.error('  Extract single:     node extract-definition.ts <source-file> <definition-name> <target-file>');
    console.error('  Extract multiple:   node extract-definition.ts <source-file> <name1,name2,name3> <target-file>');
    console.error('  Move file:          node extract-definition.ts <source-file> <target-file>');
    process.exit(1);
}

