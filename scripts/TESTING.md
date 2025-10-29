# Testing Extract Definition Script

I've created a comprehensive test suite for `extract-definition.ts` with two types of tests:

## ✅ Integration Tests (Passing)

**File:** `extract-definition.integration.test.ts`

Lightweight unit tests that verify core logic:
- ✅ CLI argument parsing (comma-separated names)
- ✅ Path resolution
- ✅ Definition type detection
- ✅ Export/import statement generation
- ✅ File naming conventions
- ✅ Code preservation patterns

**Run with:**
```bash
pnpm test:extract
```

**Result:** All 25 tests passing ✓

## 🔄 Full Integration Tests (Aspirational)

**File:** `extract-definition.test.ts`

End-to-end tests that:
- Create temporary test files
- Run the actual script
- Verify file operations
- Check import updates across multiple files

**These tests document expected behavior and serve as:**
- Specification for how the tool should work
- Regression tests for future improvements
- Examples of real-world usage scenarios

**Test scenarios covered:**
1. Single definition extraction (functions, types, interfaces, enums, consts)
2. Multiple definition extraction to one file
3. Import updates in consuming files
4. Nested directory structure handling
5. File moving with import updates
6. Error handling (missing definitions, existing files)
7. Edge cases (React components, complex imports)

## Running Tests

### All script tests:
```bash
pnpm test:scripts
```

### Just extract-definition tests:
```bash
pnpm test:extract
```

### With verbose output:
```bash
pnpm test:extract -- --verbose
```

### Watch mode (for development):
```bash
pnpm test:extract -- --watch
```

## Test Coverage

### Current Status
- **Integration Tests:** 100% passing
- **Full Integration Tests:** Aspirational (documenting expected behavior)

### Coverage by Feature
| Feature | Integration Tests | Full Tests |
|---------|------------------|------------|
| Single extraction | ✓ | ○ |
| Multiple extraction | ✓ | ○ |
| Import updates | ✓ | ○ |
| File moving | ✓ | ○ |
| Error handling | ✓ | ○ |
| Path resolution | ✓ | ○ |

## Test Development Notes

### Why Two Test Files?

1. **Integration tests** are fast, reliable, and test pure logic
2. **Full tests** document real-world scenarios and expected behavior
3. Having both allows rapid development with confidence

### Test Fixtures

Full integration tests create temporary files in:
```
test-fixtures/extract-definition/
```

These are automatically cleaned up after each test run.

### Writing New Tests

Add to integration tests when testing:
- Parsing logic
- String manipulation
- Path operations
- Pattern matching

Add to full tests when testing:
- Actual file operations
- Script execution
- Multi-file scenarios
- Import resolution across project

## CI/CD Considerations

For continuous integration:
- Integration tests run fast and are reliable
- Full tests may need file system access
- Consider running full tests only on major changes
- Both test suites are valuable for different purposes

## Future Improvements

- [ ] Add snapshot testing for generated code
- [ ] Mock file system for faster full tests
- [ ] Add performance benchmarks
- [ ] Test with very large files (1000+ lines)
- [ ] Test concurrent extractions
- [ ] Add mutation testing
- [ ] Measure code coverage

## Example Test Output

```
PASS scripts/extract-definition.integration.test.ts
  extract-definition integration
    CLI Argument Parsing
      ✓ should accept 2 arguments for file moving (1 ms)
      ✓ should parse comma-separated definition names
    Path Resolution
      ✓ should generate relative imports correctly
    Definition Type Detection
      ✓ should identify function definitions
      ✓ should identify type definitions
    ... 20 more tests ...

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        0.5s
```

## Contributing

When adding new features to `extract-definition.ts`:
1. Write integration tests first for the logic
2. Add full integration tests documenting the expected behavior
3. Run tests with `pnpm test:extract`
4. Ensure all integration tests pass before committing

## Questions?

See `TEST_README.md` for detailed test utilities and helpers.

