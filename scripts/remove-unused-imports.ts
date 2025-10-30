/**
 * Remove Unused Imports
 *
 * A utility script for removing unused imports from TypeScript files.
 *
 * Usage:
 *   # Single file
 *   pnpm remove-unused-imports <file-path>
 *
 *   # Multiple files
 *   pnpm remove-unused-imports <file1> <file2> <file3>
 *
 *   # Glob pattern (use quotes)
 *   pnpm remove-unused-imports "src/**\/*.ts"
 *
 * Examples:
 *   # Remove unused imports from a single file
 *   pnpm remove-unused-imports src/App.tsx
 *
 *   # Remove unused imports from multiple files
 *   pnpm remove-unused-imports src/utils.ts src/types.ts
 *
 *   # Remove unused imports from all TypeScript files in a directory
 *   pnpm remove-unused-imports "src/**\/*.{ts,tsx}"
 *
 * What it does:
 *   1. Parses the TypeScript file
 *   2. Identifies all imported symbols
 *   3. Checks which symbols are actually used in the file
 *   4. Removes import declarations that have no used symbols
 *   5. Updates partial imports to only include used symbols
 *   6. Preserves side-effect imports (e.g., import './styles.css')
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'fast-glob';

interface ImportInfo {
  importDeclaration: ts.ImportDeclaration;
  defaultImport?: string;
  namespaceImport?: string;
  namedImports: string[];
  moduleSpecifier: string;
  isSideEffectOnly: boolean;
}

interface UsageInfo {
  usedIdentifiers: Set<string>;
}

/**
 * Extract all import declarations from a source file
 */
function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const importClause = node.importClause;
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;

      // Side-effect only import (no import clause)
      if (!importClause) {
        imports.push({
          importDeclaration: node,
          namedImports: [],
          moduleSpecifier,
          isSideEffectOnly: true,
        });
        return;
      }

      const importInfo: ImportInfo = {
        importDeclaration: node,
        namedImports: [],
        moduleSpecifier,
        isSideEffectOnly: false,
      };

      // Default import
      if (importClause.name) {
        importInfo.defaultImport = importClause.name.text;
      }

      // Named or namespace imports
      if (importClause.namedBindings) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          // import * as name
          importInfo.namespaceImport = importClause.namedBindings.name.text;
        } else if (ts.isNamedImports(importClause.namedBindings)) {
          // import { a, b, c }
          importInfo.namedImports = importClause.namedBindings.elements.map(
            (element) => element.name.text
          );
        }
      }

      imports.push(importInfo);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

/**
 * Find all identifiers used in the source file (excluding imports)
 */
function findUsedIdentifiers(sourceFile: ts.SourceFile): UsageInfo {
  const usedIdentifiers = new Set<string>();
  let inImportDeclaration = false;

  function visit(node: ts.Node) {
    // Skip the import declarations themselves
    if (ts.isImportDeclaration(node)) {
      inImportDeclaration = true;
      ts.forEachChild(node, visit);
      inImportDeclaration = false;
      return;
    }

    // Skip type-only references in some cases, but we'll be conservative
    // and count them as usage
    if (ts.isIdentifier(node) && !inImportDeclaration) {
      usedIdentifiers.add(node.text);
    }

    // Handle JSX elements (they reference components)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName;
      if (ts.isIdentifier(tagName)) {
        usedIdentifiers.add(tagName.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { usedIdentifiers };
}

/**
 * Determine which imports are unused
 */
function findUnusedImports(
  imports: ImportInfo[],
  usage: UsageInfo
): ImportInfo[] {
  return imports.filter((importInfo) => {
    // Always keep side-effect imports
    if (importInfo.isSideEffectOnly) {
      return false;
    }

    // Check if default import is used
    if (importInfo.defaultImport) {
      if (usage.usedIdentifiers.has(importInfo.defaultImport)) {
        return false;
      }
    }

    // Check if namespace import is used
    if (importInfo.namespaceImport) {
      if (usage.usedIdentifiers.has(importInfo.namespaceImport)) {
        return false;
      }
    }

    // Check if any named import is used
    if (importInfo.namedImports.length > 0) {
      if (
        importInfo.namedImports.some((name) =>
          usage.usedIdentifiers.has(name)
        )
      ) {
        return false;
      }
    }

    // If we get here, nothing from this import is used
    return true;
  });
}

/**
 * Find imports that are partially used (some named imports unused)
 */
function findPartiallyUsedImports(
  imports: ImportInfo[],
  usage: UsageInfo
): Array<{ importInfo: ImportInfo; unusedNames: string[] }> {
  const partiallyUsed: Array<{
    importInfo: ImportInfo;
    unusedNames: string[];
  }> = [];

  for (const importInfo of imports) {
    if (importInfo.namedImports.length > 1) {
      const unusedNames = importInfo.namedImports.filter(
        (name) => !usage.usedIdentifiers.has(name)
      );

      // Only consider it partially used if some (but not all) are unused
      if (unusedNames.length > 0 && unusedNames.length < importInfo.namedImports.length) {
        partiallyUsed.push({ importInfo, unusedNames });
      }
    }
  }

  return partiallyUsed;
}

/**
 * Remove unused imports from the source code
 */
function removeUnusedImports(
  sourceFile: ts.SourceFile,
  unusedImports: ImportInfo[],
  partiallyUsed: Array<{ importInfo: ImportInfo; unusedNames: string[] }>
): string {
  const text = sourceFile.getFullText();
  const unusedSet = new Set(unusedImports.map((i) => i.importDeclaration));
  const partialMap = new Map(
    partiallyUsed.map((p) => [p.importInfo.importDeclaration, p.unusedNames])
  );

  // Sort by position (descending) so we can remove from end to start
  const allImports = [...unusedImports, ...partiallyUsed.map((p) => p.importInfo)];
  const sortedImports = allImports
    .map((info) => info.importDeclaration)
    .sort((a, b) => b.getStart() - a.getStart());

  let result = text;

  for (const importDecl of sortedImports) {
    const start = importDecl.getFullStart();
    const end = importDecl.getEnd();

    if (unusedSet.has(importDecl)) {
      // Remove the entire import
      // Find the end of the line (including the newline)
      let lineEnd = end;
      while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
      }
      if (lineEnd < text.length && text[lineEnd] === '\n') {
        lineEnd++;
      }

      result = result.substring(0, start) + result.substring(lineEnd);
    } else {
      const unusedNames = partialMap.get(importDecl);
      if (unusedNames && unusedNames.length > 0) {
        // Update the import to remove unused names
        const importClause = importDecl.importClause!;
        const namedBindings = importClause.namedBindings as ts.NamedImports;

        const usedElements = namedBindings.elements.filter(
          (element) => !unusedNames.includes(element.name.text)
        );

        // Reconstruct the import
        const moduleSpecifier = (importDecl.moduleSpecifier as ts.StringLiteral).text;
        const usedNames = usedElements.map((e) => e.name.text).join(', ');

        let newImport: string;
        if (importClause.name) {
          // Has default import
          newImport = `import ${importClause.name.text}, { ${usedNames} } from '${moduleSpecifier}';`;
        } else {
          newImport = `import { ${usedNames} } from '${moduleSpecifier}';`;
        }

        result = result.substring(0, start) + newImport + result.substring(end);
      }
    }
  }

  return result;
}

/**
 * Process a single file
 */
function processFile(filePath: string, dryRun: boolean = false): boolean {
  try {
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const sourceFile = ts.createSourceFile(
      fullPath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const imports = extractImports(sourceFile);
    const usage = findUsedIdentifiers(sourceFile);
    const unusedImports = findUnusedImports(imports, usage);
    const partiallyUsed = findPartiallyUsedImports(imports, usage);

    if (unusedImports.length === 0 && partiallyUsed.length === 0) {
      console.log(`✓ ${filePath} - No unused imports`);
      return false;
    }

    console.log(`\n${filePath}:`);

    if (unusedImports.length > 0) {
      console.log(`  Found ${unusedImports.length} unused import(s):`);
      for (const importInfo of unusedImports) {
        const names: string[] = [];
        if (importInfo.defaultImport) names.push(importInfo.defaultImport);
        if (importInfo.namespaceImport) names.push(`* as ${importInfo.namespaceImport}`);
        if (importInfo.namedImports.length > 0) names.push(`{ ${importInfo.namedImports.join(', ')} }`);
        console.log(`    - ${names.join(', ')} from '${importInfo.moduleSpecifier}'`);
      }
    }

    if (partiallyUsed.length > 0) {
      console.log(`  Found ${partiallyUsed.length} partially unused import(s):`);
      for (const { importInfo, unusedNames } of partiallyUsed) {
        console.log(`    - { ${unusedNames.join(', ')} } from '${importInfo.moduleSpecifier}' (unused)`);
      }
    }

    if (dryRun) {
      console.log('  [DRY RUN] Would remove unused imports');
      return true;
    }

    const newContent = removeUnusedImports(sourceFile, unusedImports, partiallyUsed);
    fs.writeFileSync(fullPath, newContent, 'utf-8');
    console.log('  ✓ Removed unused imports');

    return true;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: pnpm remove-unused-imports <file-path> [file-path...]');
    console.log('       pnpm remove-unused-imports "glob-pattern"');
    console.log('\nOptions:');
    console.log('  --dry-run    Show what would be removed without making changes');
    console.log('\nExamples:');
    console.log('  pnpm remove-unused-imports src/App.tsx');
    console.log('  pnpm remove-unused-imports "src/**/*.{ts,tsx}"');
    console.log('  pnpm remove-unused-imports --dry-run src/utils.ts');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const fileArgs = args.filter((arg) => arg !== '--dry-run');

  // Expand glob patterns
  let filePaths: string[] = [];
  for (const arg of fileArgs) {
    if (arg.includes('*') || arg.includes('?')) {
      const matches = await glob(arg, { absolute: false });
      filePaths.push(...matches);
    } else {
      filePaths.push(arg);
    }
  }

  // Filter to only TypeScript files
  filePaths = filePaths.filter(
    (f) => f.endsWith('.ts') || f.endsWith('.tsx')
  );

  if (filePaths.length === 0) {
    console.log('No TypeScript files found to process');
    process.exit(0);
  }

  console.log(`Processing ${filePaths.length} file(s)...${dryRun ? ' (DRY RUN)' : ''}\n`);

  let modifiedCount = 0;
  for (const filePath of filePaths) {
    if (processFile(filePath, dryRun)) {
      modifiedCount++;
    }
  }

  console.log(`\n${modifiedCount} file(s) ${dryRun ? 'would be' : 'were'} modified`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

