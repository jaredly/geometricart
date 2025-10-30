/**
 * Tests for remove-unused-imports.ts
 *
 * These tests verify the functionality of removing unused imports from TypeScript files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SCRIPT_PATH = path.resolve(__dirname, 'remove-unused-imports.ts');
const TEST_DIR = path.resolve(__dirname, '../test-fixtures/remove-unused-imports');

// Helper function to run the remove-unused-imports script
function runRemoveUnusedImports(
  args: string[]
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = execSync(`bun ${SCRIPT_PATH} ${args.join(' ')}`, {
      cwd: TEST_DIR,
      encoding: 'utf-8',
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.status || 1,
    };
  }
}

// Helper to create test files
function createTestFile(filePath: string, content: string) {
  const fullPath = path.join(TEST_DIR, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// Helper to read test file
function readTestFile(filePath: string): string {
  return fs.readFileSync(path.join(TEST_DIR, filePath), 'utf-8');
}

// Cleanup helper
function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('remove-unused-imports', () => {
  beforeEach(() => {
    cleanupTestDir();
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Completely Unused Imports', () => {
    it('should remove a completely unused default import', () => {
      createTestFile(
        'test.ts',
        `import React from 'react';
import { useState } from 'react';

export function Component() {
  const [count, setCount] = useState(0);
  return count;
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).not.toContain("import React from 'react'");
      expect(content).toContain("import { useState } from 'react'");
      expect(content).toContain('useState(0)');
    });

    it('should remove completely unused named imports', () => {
      createTestFile(
        'test.ts',
        `import { foo, bar, baz } from './utils';

export function test() {
  return 'hello';
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).not.toContain('import');
      expect(content).toContain('export function test()');
    });

    it('should remove completely unused namespace import', () => {
      createTestFile(
        'test.ts',
        `import * as Utils from './utils';

export function test() {
  return 'hello';
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).not.toContain('import');
    });

    it('should remove multiple unused imports', () => {
      createTestFile(
        'test.ts',
        `import React from 'react';
import { Component } from 'react';
import * as Utils from './utils';
import { foo, bar } from './helpers';

export function test() {
  return 'hello';
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).not.toContain('import');
      expect(content).toContain('export function test()');
    });
  });

  describe('Partially Unused Imports', () => {
    it('should remove only unused names from named imports', () => {
      createTestFile(
        'test.ts',
        `import { foo, bar, baz } from './utils';

export function test() {
  return foo();
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { foo } from './utils'");
      expect(content).not.toContain('bar');
      expect(content).not.toContain('baz');
    });

    it('should keep used imports and remove unused ones', () => {
      createTestFile(
        'test.ts',
        `import { useState, useEffect, useCallback } from 'react';

export function Component() {
  const [count, setCount] = useState(0);

  useCallback(() => {
    console.log(count);
  }, [count]);

  return count;
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { useState, useCallback } from 'react'");
      expect(content).not.toContain('useEffect');
    });

    it('should handle imports with both default and named imports', () => {
      createTestFile(
        'test.ts',
        `import React, { useState, useEffect } from 'react';

export function Component() {
  const [count] = useState(0);
  return React.createElement('div', null, count);
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import React, { useState } from 'react'");
      expect(content).not.toContain('useEffect');
    });
  });

  describe('Preserved Imports', () => {
    it('should preserve side-effect imports', () => {
      createTestFile(
        'test.ts',
        `import './styles.css';
import 'polyfills';

export function test() {
  return 'hello';
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import './styles.css'");
      expect(content).toContain("import 'polyfills'");
    });

    it('should preserve all imports when all are used', () => {
      createTestFile(
        'test.ts',
        `import { foo, bar, baz } from './utils';

export function test() {
  return foo() + bar() + baz();
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No unused imports');
      const content = readTestFile('test.ts');
      expect(content).toContain("import { foo, bar, baz } from './utils'");
    });

    it('should preserve namespace imports when used', () => {
      createTestFile(
        'test.ts',
        `import * as Utils from './utils';

export function test() {
  return Utils.foo();
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import * as Utils from './utils'");
    });
  });

  describe('JSX and React Components', () => {
    it('should detect component usage in JSX', () => {
      createTestFile(
        'test.tsx',
        `import React from 'react';
import { Button } from './Button';
import { Input } from './Input';

export function Form() {
  return <Button>Click me</Button>;
}
`
      );

      const result = runRemoveUnusedImports(['test.tsx']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.tsx');
      expect(content).toContain("import { Button } from './Button'");
      expect(content).not.toContain('Input');
    });

    it('should handle self-closing JSX elements', () => {
      createTestFile(
        'test.tsx',
        `import { Input, Button } from './components';

export function Form() {
  return <Input />;
}
`
      );

      const result = runRemoveUnusedImports(['test.tsx']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.tsx');
      expect(content).toContain("import { Input } from './components'");
      expect(content).not.toContain('Button');
    });
  });

  describe('Multiple Files', () => {
    it('should process multiple files at once', () => {
      createTestFile(
        'file1.ts',
        `import { unused } from './utils';

export const test1 = 'hello';
`
      );

      createTestFile(
        'file2.ts',
        `import { alsoUnused } from './helpers';

export const test2 = 'world';
`
      );

      const result = runRemoveUnusedImports(['file1.ts', 'file2.ts']);

      expect(result.exitCode).toBe(0);

      const content1 = readTestFile('file1.ts');
      expect(content1).not.toContain('import');

      const content2 = readTestFile('file2.ts');
      expect(content2).not.toContain('import');
    });

    it('should handle glob patterns', () => {
      createTestFile(
        'src/a.ts',
        `import { unused } from './utils';

export const a = 1;
`
      );

      createTestFile(
        'src/b.ts',
        `import { alsoUnused } from './helpers';

export const b = 2;
`
      );

      const result = runRemoveUnusedImports(['src/*.ts']);

      expect(result.exitCode).toBe(0);

      const contentA = readTestFile('src/a.ts');
      expect(contentA).not.toContain('import');

      const contentB = readTestFile('src/b.ts');
      expect(contentB).not.toContain('import');
    });
  });

  describe('Dry Run Mode', () => {
    it('should not modify files in dry run mode', () => {
      const originalContent = `import { unused } from './utils';

export function test() {
  return 'hello';
}
`;
      createTestFile('test.ts', originalContent);

      const result = runRemoveUnusedImports(['--dry-run', 'test.ts']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');

      const content = readTestFile('test.ts');
      expect(content).toBe(originalContent);
    });

    it('should show what would be removed in dry run', () => {
      createTestFile(
        'test.ts',
        `import { foo, bar } from './utils';

export function test() {
  return 'hello';
}
`
      );

      const result = runRemoveUnusedImports(['--dry-run', 'test.ts']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('unused import');
      expect(result.stdout).toContain('foo, bar');
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with no imports', () => {
      createTestFile(
        'test.ts',
        `export function test() {
  return 'hello';
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No unused imports');
    });

    it('should handle type imports', () => {
      createTestFile(
        'test.ts',
        `import type { User } from './types';
import { formatUser } from './utils';

export function test(user: User) {
  return formatUser(user);
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      // Both should be preserved - User is used in type annotation
      expect(content).toContain('User');
      expect(content).toContain('formatUser');
    });

    it('should handle imports used in type annotations only', () => {
      createTestFile(
        'test.ts',
        `import { User, Admin } from './types';

export function test(user: User) {
  return user;
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { User } from './types'");
      expect(content).not.toContain('Admin');
    });

    it('should preserve imports used in default parameters', () => {
      createTestFile(
        'test.ts',
        `import { DEFAULT_CONFIG, UNUSED_CONFIG } from './config';

export function test(config = DEFAULT_CONFIG) {
  return config;
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { DEFAULT_CONFIG } from './config'");
      expect(content).not.toContain('UNUSED_CONFIG');
    });

    it('should handle imports with same name as local variables', () => {
      createTestFile(
        'test.ts',
        `import { foo } from './utils';

export function test() {
  const foo = 'local';
  return foo;
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      // The imported foo is shadowed by the local variable, so it's unused
      expect(content).not.toContain('import');
    });

    it('should preserve imports used in destructuring', () => {
      createTestFile(
        'test.ts',
        `import { Config } from './types';
import { parseConfig } from './utils';

export function test() {
  const { name } = parseConfig() as Config;
  return name;
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain('Config');
      expect(content).toContain('parseConfig');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed used and unused imports from same module', () => {
      createTestFile(
        'test.ts',
        `import { a, b, c, d, e } from './utils';

export function test() {
  return a() + c() + e();
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { a, c, e } from './utils'");
      expect(content).not.toContain('b');
      expect(content).not.toContain('d');
    });

    it('should handle imports used in nested function calls', () => {
      createTestFile(
        'test.ts',
        `import { outer, inner, unused } from './utils';

export function test() {
  return outer(inner());
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { outer, inner } from './utils'");
      expect(content).not.toContain('unused');
    });

    it('should handle imports in class definitions', () => {
      createTestFile(
        'test.ts',
        `import { BaseClass, Interface, Unused } from './base';

export class MyClass extends BaseClass implements Interface {
  test() {
    return 'hello';
  }
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { BaseClass, Interface } from './base'");
      expect(content).not.toContain('Unused');
    });

    it('should handle imports used in decorators', () => {
      createTestFile(
        'test.ts',
        `import { Component, Injectable, Unused } from './decorators';

@Component()
@Injectable()
export class MyService {
  test() {
    return 'hello';
  }
}
`
      );

      const result = runRemoveUnusedImports(['test.ts']);

      expect(result.exitCode).toBe(0);
      const content = readTestFile('test.ts');
      expect(content).toContain("import { Component, Injectable } from './decorators'");
      expect(content).not.toContain('Unused');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', () => {
      const result = runRemoveUnusedImports(['non-existent.ts']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('0 file(s)');
    });

    it('should handle invalid TypeScript syntax', () => {
      createTestFile(
        'invalid.ts',
        `import { foo from './utils';
// Missing closing brace

export function test(
  return foo();
}
`
      );

      const result = runRemoveUnusedImports(['invalid.ts']);

      // Should not crash, but may report an error
      expect(result.exitCode).toBe(0);
    });
  });
});

