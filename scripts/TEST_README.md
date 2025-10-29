# Extract Definition Tests

This directory contains comprehensive tests for the `extract-definition.ts` script.

## Test Files

### `extract-definition.test.ts`
Full integration tests that:
- Create temporary test files
- Run the actual extract-definition script
- Verify file creation, modification, and import updates
- Test error handling

**Test Coverage:**
- ✅ Single definition extraction (functions, types, interfaces, enums, consts)
- ✅ Multiple definition extraction to one file
- ✅ Import updates across files
- ✅ Nested directory imports
- ✅ File moving
- ✅ Error handling (missing definitions, existing files, etc.)
- ✅ Edge cases (complex imports, React components, etc.)

### `extract-definition.integration.test.ts`
Lightweight unit tests for:
- Argument parsing
- Path resolution
- Definition type detection
- Export/import statement generation
- File naming conventions
- Code preservation

## Running Tests

### Run all script tests:
```bash
pnpm test scripts/
```

### Run only extract-definition tests:
```bash
pnpm test scripts/extract-definition
```

### Run with coverage:
```bash
pnpm test -- --coverage scripts/
```

### Run in watch mode:
```bash
pnpm test -- --watch scripts/extract-definition
```

## Test Structure

```
test-fixtures/
└── extract-definition/          # Created during tests, cleaned up after
    ├── utils.ts                 # Sample source files
    ├── consumer.ts              # Files that import from sources
    └── src/
        └── components/          # Nested directory structure
```

## Writing New Tests

### Adding a new test case:

```typescript
it('should handle your scenario', () => {
    // 1. Create test files
    createTestFile('source.ts', `
export function myFunction() {
    return 'test';
}
`);

    // 2. Run the script
    const result = runExtractDefinition(['source.ts', 'myFunction', 'output.ts']);

    // 3. Assert results
    expect(result.exitCode).toBe(0);
    expect(testFileExists('output.ts')).toBe(true);

    // 4. Verify file contents
    const output = readTestFile('output.ts');
    expect(output).toContain('function myFunction');
});
```

## Test Utilities

### `createTestFile(path, content)`
Creates a test file with the given content in the test fixtures directory.

### `readTestFile(path)`
Reads a test file and returns its contents as a string.

### `testFileExists(path)`
Checks if a test file exists.

### `runExtractDefinition(args)`
Runs the extract-definition script with the given arguments and returns:
- `stdout`: Standard output
- `stderr`: Error output
- `exitCode`: Exit code (0 for success)

### `cleanupTestDir()`
Removes all test fixtures (automatically called after each test).

## Continuous Integration

These tests are designed to run in CI environments and will:
- Create isolated test directories
- Clean up after themselves
- Not interfere with actual project files
- Provide clear failure messages

## Debugging Tests

To debug a failing test:

1. **Keep test fixtures:** Comment out `cleanupTestDir()` in `afterEach`
2. **Inspect files:** Check `test-fixtures/extract-definition/` directory
3. **Add logging:** Use `console.log(result.stdout)` to see script output
4. **Run single test:** Use `.only` or `.skip` in describe/it blocks

```typescript
it.only('should debug this specific test', () => {
    // Only this test will run
});
```

## Coverage Goals

Current coverage targets:
- Statements: > 80%
- Branches: > 70%
- Functions: > 80%
- Lines: > 80%

## Known Limitations

1. Tests create real files (not mocked) for realistic testing
2. Some tests require Node.js file system access
3. Tests are slower than pure unit tests due to file I/O
4. Babel parser adds some overhead

## Future Improvements

- [ ] Add performance benchmarks
- [ ] Test with very large files (1000+ lines)
- [ ] Test with circular dependencies
- [ ] Add snapshot testing for generated code
- [ ] Mock file system for faster tests
- [ ] Test concurrent extractions
- [ ] Test with monorepo structure

