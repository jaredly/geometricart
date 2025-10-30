# Scripts

Utility scripts for maintaining and refactoring the TypeScript codebase.

## Available Scripts

### 1. Extract Definition (`extract-definition.ts`)

Extracts one or more top-level definitions from a TypeScript file into a new file and automatically updates all imports across the project.

**Usage:**
```bash
# Extract single definition
pnpm extract-definition <source-file> <definition-name> <target-file>

# Extract multiple definitions (comma-separated, no spaces)
pnpm extract-definition <source-file> <def1,def2,def3> <target-file>

# Move entire file
pnpm extract-definition <source-file> <target-file>
```

**Examples:**
```bash
# Extract a function
pnpm extract-definition src/utils.ts formatDate src/utils/formatDate.ts

# Extract multiple related utilities
pnpm extract-definition src/utils.ts "formatDate,parseDate,isValidDate" src/utils/dates.ts

# Move a file
pnpm extract-definition src/utils/helpers.ts src/utils/string-helpers.ts
```

**Features:**
- ✅ Handles functions, classes, types, interfaces, enums, and constants
- ✅ Automatically detects and handles dependencies
- ✅ Updates all imports across the project
- ✅ Auto-exports non-exported dependencies when needed
- ✅ Detects JSX and auto-adjusts file extension to .tsx
- ✅ Preserves multi-line imports

**See:** [CHANGES.md](./CHANGES.md) for detailed behavior and recent improvements.

---

### 2. Fix Non-Component Exports (`fix-non-component-exports.ts`)

Analyzes the project to find files that mix React component exports with non-component exports (types, utilities, constants, etc.) and generates commands to separate them.

**Usage:**
```bash
pnpm fix-non-component-exports [--dry-run] [--execute] [--group-types] [--group-consts]
```

**Options:**
- `--dry-run` - Show what would be extracted without generating commands (default)
- `--execute` - Actually run the extract-definition commands
- `--group-types` - Group types/interfaces/enums together into a single file per component file
- `--group-consts` - Group constants together into a single file per component file

**Examples:**
```bash
# Dry run - see what would be extracted
pnpm fix-non-component-exports

# Group types and consts, then execute
pnpm fix-non-component-exports --group-types --group-consts --execute
```

**What it does:**
- Scans all TypeScript/TSX files
- Identifies files with both component and non-component exports
- Generates extract-definition commands to separate them
- Optionally executes the commands automatically

---

### 3. Remove Unused Exports (`remove-unused-exports.ts`) ⭐ NEW

Analyzes the TypeScript project to find exports that are never imported anywhere and optionally removes them.

**Usage:**
```bash
pnpm remove-unused-exports [options]
```

**Options:**
- `--dry-run` - Show unused exports without removing them (default)
- `--fix` - Actually remove the unused exports
- `--entry <paths>` - Comma-separated list of entry point files/patterns to keep all exports
- `--ignore <paths>` - Comma-separated list of file patterns to ignore
- `--verbose` - Show detailed information about each export
- `--json` - Output results as JSON

**Examples:**
```bash
# Dry run - see what would be removed
pnpm remove-unused-exports

# Remove unused exports
pnpm remove-unused-exports --fix

# Specify entry points to preserve
pnpm remove-unused-exports --entry "src/index.ts,src/run.tsx" --fix

# Verbose output
pnpm remove-unused-exports --verbose

# JSON output for tooling
pnpm remove-unused-exports --json
```

**Features:**
- ✅ Detects unused named and default exports
- ✅ Handles type-only exports correctly
- ✅ Tracks re-exports and namespace imports
- ✅ Preserves entry point exports
- ✅ Handles dynamic imports
- ✅ Safe dry-run mode by default

**Entry Points:**
By default, the following are considered entry points where all exports are kept:
- `src/index.ts`
- `src/run.tsx`
- `src/editor.client.tsx`
- Files matching `**/*.client.tsx`, `**/*.server.tsx`

**Special Cases:**
- Default exports in files with only a default export are kept
- Re-exports (`export * from './foo'`) are tracked properly
- Type-only exports and imports are handled separately
- Files in entry points keep all their exports

**Example Output:**
```
🔍 Analyzing project for unused exports...

📊 Analysis Results:
   Total files: 247
   Total exports: 1,543
   Total imports: 2,891
   Unused exports: 23

🗑️  Unused Exports:

📄 src/utils/helpers.ts
   - formatLegacyDate (function, named) at line 45
   - DEPRECATED_CONSTANT (const, named [type]) at line 12

📄 src/components/Button.tsx
   - ButtonSize (type, named [type]) at line 8

💡 Tip: Run with --fix to automatically remove unused exports
   Example: pnpm remove-unused-exports --fix
```

---

### 4. Fix Tilings (`fix-tilings.ts`)

Project-specific script for fixing tiling data structures.

---

## Testing

All scripts have comprehensive test coverage.

**Run all script tests:**
```bash
pnpm test:scripts
# or
pnpm test scripts/
```

**Run specific script tests:**
```bash
pnpm test:extract           # Extract definition tests
pnpm test:remove-unused     # Unused exports tests
```

**Test with coverage:**
```bash
pnpm test -- --coverage scripts/
```

**See:** [TESTING.md](./TESTING.md) and [TEST_README.md](./TEST_README.md) for detailed test documentation.

---

## Workflow Examples

### Cleaning Up a File

1. First, separate component and non-component exports:
```bash
pnpm fix-non-component-exports --group-types --execute
```

2. Then remove any unused exports:
```bash
pnpm remove-unused-exports --fix
```

### Refactoring a Large File

1. Extract specific definitions:
```bash
pnpm extract-definition src/utils.ts "helper1,helper2,helper3" src/utils/helpers.ts
```

2. Check for unused exports in the original file:
```bash
pnpm remove-unused-exports --verbose
```

3. Remove any that are now unused:
```bash
pnpm remove-unused-exports --fix
```

### Before a Major Refactor

1. Identify files with mixed exports:
```bash
pnpm fix-non-component-exports
```

2. Identify unused exports:
```bash
pnpm remove-unused-exports --verbose
```

3. Save the output and review before taking action

---

## Common Patterns

### Moving a Utility Function

```bash
# Before: src/utils.ts has many functions
# Want: Move formatDate to its own file

pnpm extract-definition src/utils.ts formatDate src/utils/formatDate.ts
# ✅ Creates src/utils/formatDate.ts
# ✅ Updates all imports automatically
```

### Cleaning Up a Component File

```bash
# Before: Component.tsx has component + types + utils
# Want: Separate concerns

pnpm fix-non-component-exports --group-types --execute
# ✅ Extracts types to Component.types.ts
# ✅ Updates all imports automatically
```

### Finding Dead Code

```bash
# See what's unused
pnpm remove-unused-exports --verbose

# Remove it
pnpm remove-unused-exports --fix
```

---

## Script Architecture

All scripts use:
- **@babel/parser** - Parse TypeScript/TSX with JSX support
- **@babel/traverse** - AST traversal for finding definitions and imports
- **@babel/types** - AST node type checking and manipulation
- **fast-glob** - Fast file searching with glob patterns

This ensures consistent, reliable code analysis across all scripts.

---

## Best Practices

1. **Always dry-run first** - Use default dry-run mode to see what will happen
2. **Review output** - Check generated commands or changes before executing
3. **Use version control** - Commit before running scripts, review diffs after
4. **Test after changes** - Run tests to ensure nothing broke
5. **Use verbose mode** - When debugging, add `--verbose` or `--json` for more details

---

## Troubleshooting

### Script can't find file
- Ensure you're running from project root
- Use relative paths from project root
- Check file extensions (.ts vs .tsx)

### Imports not updating
- Ensure all files are saved
- Check if files are ignored by glob patterns
- Try running again (some edge cases require multiple passes)

### Parse errors
- Ensure code compiles (run TypeScript compiler)
- Check for syntax errors in source files
- Try parsing with `--verbose` to see detailed errors

---

## Contributing

When adding new scripts:

1. Follow the existing patterns (see `extract-definition.ts`)
2. Add comprehensive JSDoc comments at the top
3. Include usage examples and options documentation
4. Write tests (see `*.test.ts` files)
5. Update this README with the new script
6. Add the script to `package.json` scripts section

---

## Related Documentation

- [CHANGES.md](./CHANGES.md) - Recent changes to extract-definition
- [TESTING.md](./TESTING.md) - Testing guidelines
- [TEST_README.md](./TEST_README.md) - Detailed test documentation

