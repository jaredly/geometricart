/**
 * Tests for extract-definition.ts
 *
 * These tests verify the functionality of extracting definitions from TypeScript files,
 * moving files, and updating imports across the project.
 */

import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';

const SCRIPT_PATH = path.resolve(__dirname, 'extract-definition.ts');
const TEST_DIR = path.resolve(__dirname, '../test-fixtures/extract-definition');

// Helper function to run the extract-definition script
function runExtractDefinition(args: string[]): {stdout: string; stderr: string; exitCode: number} {
    try {
        const result = execSync(
            `bun ${SCRIPT_PATH} ${args.join(' ')}`,
            {
                cwd: TEST_DIR,
                encoding: 'utf-8',
            }
        );
        return {stdout: result, stderr: '', exitCode: 0};
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
        fs.mkdirSync(dir, {recursive: true});
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
}

// Helper to read test file
function readTestFile(filePath: string): string {
    return fs.readFileSync(path.join(TEST_DIR, filePath), 'utf-8');
}

// Helper to check if file exists
function testFileExists(filePath: string): boolean {
    return fs.existsSync(path.join(TEST_DIR, filePath));
}

// Cleanup helper
function cleanupTestDir() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, {recursive: true, force: true});
    }
}

describe('extract-definition', () => {
    beforeEach(() => {
        cleanupTestDir();
        fs.mkdirSync(TEST_DIR, {recursive: true});
    });

    afterEach(() => {
        cleanupTestDir();
    });

    describe('Single Definition Extraction', () => {
        it('should extract a single function to a new file', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function parseDate(str: string): Date {
    return new Date(str);
}
`);

            const result = runExtractDefinition(['utils.ts', 'formatDate', 'formatDate.ts']);

            expect(result.exitCode).toBe(0);
            expect(testFileExists('formatDate.ts')).toBe(true);

            const newFile = readTestFile('formatDate.ts');
            expect(newFile).toContain('function formatDate');
            expect(newFile).toContain('return date.toISOString()');

            const sourceFile = readTestFile('utils.ts');
            // Should NOT contain re-export - completely removed!
            expect(sourceFile).not.toContain('formatDate');
            expect(sourceFile).toContain('export function parseDate');
        });

        it('should extract a type definition to a new file', () => {
            createTestFile('types.ts', `
export type User = {
    id: string;
    name: string;
};

export type Post = {
    id: string;
    title: string;
};
`);

            const result = runExtractDefinition(['types.ts', 'User', 'User.ts']);

            expect(result.exitCode).toBe(0);
            expect(testFileExists('User.ts')).toBe(true);

            const newFile = readTestFile('User.ts');
            expect(newFile).toContain('type User =');
            expect(newFile).not.toContain('type Post');
        });

        it('should extract an interface to a new file', () => {
            createTestFile('interfaces.ts', `
export interface Config {
    apiUrl: string;
    timeout: number;
}

export interface Theme {
    primaryColor: string;
}
`);

            const result = runExtractDefinition(['interfaces.ts', 'Config', 'Config.ts']);

            expect(result.exitCode).toBe(0);
            const newFile = readTestFile('Config.ts');
            expect(newFile).toContain('interface Config');
        });

        it('should extract a const with its dependencies', () => {
            createTestFile('constants.ts', `
const PREFIX = 'app';

export const API_KEY = \`\${PREFIX}_key\`;
export const API_SECRET = 'secret';
`);

            const result = runExtractDefinition(['constants.ts', 'API_KEY', 'apiKey.ts']);

            expect(result.exitCode).toBe(0);
            const newFile = readTestFile('apiKey.ts');
            // Should include the PREFIX dependency
            expect(newFile).toContain('PREFIX');
            expect(newFile).toContain('API_KEY');
        });
    });

    describe('Multiple Definition Extraction', () => {
        it('should extract multiple functions to a single file', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function parseDate(str: string): Date {
    return new Date(str);
}

export function isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
}

export function unrelatedFunction() {
    return 'stay here';
}
`);

            const result = runExtractDefinition(['utils.ts', 'formatDate,parseDate,isValidDate', 'dates.ts']);

            expect(result.exitCode).toBe(0);
            expect(testFileExists('dates.ts')).toBe(true);

            const newFile = readTestFile('dates.ts');
            expect(newFile).toContain('function formatDate');
            expect(newFile).toContain('function parseDate');
            expect(newFile).toContain('function isValidDate');
            expect(newFile).not.toContain('unrelatedFunction');

            const sourceFile = readTestFile('utils.ts');
            // Should NOT contain re-export - completely removed!
            expect(sourceFile).not.toContain('formatDate');
            expect(sourceFile).not.toContain('parseDate');
            expect(sourceFile).not.toContain('isValidDate');
            expect(sourceFile).toContain('export function unrelatedFunction');
        });

        it('should extract multiple types to a single file', () => {
            createTestFile('types.ts', `
export type User = {id: string; name: string};
export type UserRole = 'admin' | 'user';
export type UserPermissions = string[];
export type Post = {id: string; title: string};
`);

            const result = runExtractDefinition(['types.ts', 'User,UserRole,UserPermissions', 'user.ts']);

            expect(result.exitCode).toBe(0);
            const newFile = readTestFile('user.ts');
            expect(newFile).toContain('type User =');
            expect(newFile).toContain('type UserRole =');
            expect(newFile).toContain('type UserPermissions =');
            expect(newFile).not.toContain('type Post');
        });

        it('should handle mixed types and interfaces', () => {
            createTestFile('definitions.ts', `
export type UserId = string;
export interface User {
    id: UserId;
    name: string;
}
export const DEFAULT_USER: User = {id: '1', name: 'Default'};
`);

            const result = runExtractDefinition(['definitions.ts', 'UserId,User', 'user-types.ts']);

            expect(result.exitCode).toBe(0);
            const newFile = readTestFile('user-types.ts');
            expect(newFile).toContain('type UserId');
            expect(newFile).toContain('interface User');
        });
    });

    describe('Import Updates', () => {
        it('should update imports in other files', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}
`);

            createTestFile('consumer.ts', `
import {formatDate} from './utils';

export function useDate() {
    return formatDate(new Date());
}
`);

            const result = runExtractDefinition(['utils.ts', 'formatDate', 'formatDate.ts']);

            expect(result.exitCode).toBe(0);

            const consumerFile = readTestFile('consumer.ts');
            expect(consumerFile).toContain("import {formatDate} from './formatDate'");
            expect(consumerFile).not.toContain("from './utils'");
        });

        it('should handle multiple imports from the same file', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function parseDate(str: string): Date {
    return new Date(str);
}
`);

            createTestFile('consumer.ts', `
import {formatDate, parseDate} from './utils';

export function useDate() {
    return {
        format: formatDate(new Date()),
        parse: parseDate('2024-01-01')
    };
}
`);

            const result = runExtractDefinition(['utils.ts', 'formatDate', 'formatDate.ts']);

            expect(result.exitCode).toBe(0);

            const consumerFile = readTestFile('consumer.ts');
            expect(consumerFile).toContain("import {parseDate} from './utils'");
            expect(consumerFile).toContain("import {formatDate} from './formatDate'");
        });

        it('should update nested directory imports', () => {
            createTestFile('src/utils.ts', `
export function helper() {
    return 'help';
}
`);

            createTestFile('src/components/Component.tsx', `
import {helper} from '../utils';

export function Component() {
    return helper();
}
`);

            const result = runExtractDefinition(['src/utils.ts', 'helper', 'src/helper.ts']);

            expect(result.exitCode).toBe(0);

            const componentFile = readTestFile('src/components/Component.tsx');
            expect(componentFile).toContain("import {helper} from '../helper'");
        });
    });

    describe('File Moving', () => {
        it('should move an entire file to a new location', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function parseDate(str: string): Date {
    return new Date(str);
}
`);

            const result = runExtractDefinition(['utils.ts', 'date-utils.ts']);

            expect(result.exitCode).toBe(0);
            expect(testFileExists('date-utils.ts')).toBe(true);
            expect(testFileExists('utils.ts')).toBe(false);

            const newFile = readTestFile('date-utils.ts');
            expect(newFile).toContain('function formatDate');
            expect(newFile).toContain('function parseDate');
        });

        it('should update imports when moving a file', () => {
            createTestFile('utils.ts', `
export function helper() {
    return 'help';
}
`);

            createTestFile('consumer.ts', `
import {helper} from './utils';

export function use() {
    return helper();
}
`);

            const result = runExtractDefinition(['utils.ts', 'helpers.ts']);

            expect(result.exitCode).toBe(0);

            const consumerFile = readTestFile('consumer.ts');
            expect(consumerFile).toContain("import {helper} from './helpers'");
        });
    });

    describe('Error Handling', () => {
        it('should error when definition is not found', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}
`);

            const result = runExtractDefinition(['utils.ts', 'nonExistent', 'output.ts']);

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('not found');
        });

        it('should error when extracting to an existing file', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}
`);

            createTestFile('formatDate.ts', 'existing content');

            const result = runExtractDefinition(['utils.ts', 'formatDate', 'formatDate.ts']);

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('existing');
        });

        it('should error when source file does not exist', () => {
            const result = runExtractDefinition(['nonexistent.ts', 'something', 'output.ts']);

            expect(result.exitCode).not.toBe(0);
        });

        it('should error when multiple definitions requested but one is missing', () => {
            createTestFile('utils.ts', `
export function formatDate(date: Date): string {
    return date.toISOString();
}
`);

            const result = runExtractDefinition(['utils.ts', 'formatDate,nonExistent', 'output.ts']);

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('not found');
        });
    });

    describe('Edge Cases', () => {
        it('should handle functions with complex imports', () => {
            createTestFile('utils.ts', `
import {format} from 'date-fns';
import type {Options} from './options';

export function formatDate(date: Date, options: Options): string {
    return format(date, 'yyyy-MM-dd');
}
`);

            createTestFile('options.ts', `
export type Options = {locale?: string};
`);

            const result = runExtractDefinition(['utils.ts', 'formatDate', 'formatDate.ts']);

            expect(result.exitCode).toBe(0);

            const newFile = readTestFile('formatDate.ts');
            expect(newFile).toContain("import {format} from 'date-fns'");
            expect(newFile).toContain("import type {Options} from './options'");
        });

        it('should handle React components', () => {
            createTestFile('Button.tsx', `
import React from 'react';

export type ButtonProps = {
    label: string;
    onClick: () => void;
};

export const Button: React.FC<ButtonProps> = ({label, onClick}) => {
    return <button onClick={onClick}>{label}</button>;
};
`);

            const result = runExtractDefinition(['Button.tsx', 'ButtonProps', 'ButtonProps.ts']);

            expect(result.exitCode).toBe(0);

            const newFile = readTestFile('ButtonProps.ts');
            expect(newFile).toContain('type ButtonProps');

            const buttonFile = readTestFile('Button.tsx');
            // Should NOT contain re-export - import only if still used
            expect(buttonFile).toContain("import {ButtonProps} from './ButtonProps'");
            expect(buttonFile).toContain('export const Button');
        });

        it('should handle same-file dependencies and export them', () => {
            createTestFile('utils.ts', `
const a = 1;

export const b = () => a;

export function otherFunction() {
    return 'other';
}
`);

            const result = runExtractDefinition(['utils.ts', 'b', 'b.ts']);

            expect(result.exitCode).toBe(0);

            const newFile = readTestFile('b.ts');
            // Should import 'a' dependency from original file
            expect(newFile).toContain("import {a} from './utils'");
            expect(newFile).toContain('const b =');

            const utilsFile = readTestFile('utils.ts');
            // Should EXPORT 'a' now (it was not exported before!)
            expect(utilsFile).toContain('export const a = 1');
            expect(utilsFile).toContain('otherFunction');
            expect(utilsFile).not.toContain('const b');
        });

        it('should handle already-exported same-file dependencies', () => {
            createTestFile('utils.ts', `
export const PREFIX = 'app';

export function getKey(id: string) {
    return \`\${PREFIX}_\${id}\`;
}
`);

            const result = runExtractDefinition(['utils.ts', 'getKey', 'getKey.ts']);

            expect(result.exitCode).toBe(0);

            const newFile = readTestFile('getKey.ts');
            // Should import PREFIX dependency from original file
            expect(newFile).toContain("import {PREFIX} from './utils'");
            expect(newFile).toContain('function getKey');

            const utilsFile = readTestFile('utils.ts');
            // PREFIX should still be exported (was already exported)
            expect(utilsFile).toContain('export const PREFIX');
            // Should NOT add double export
            expect(utilsFile.match(/export.*PREFIX/g)).toHaveLength(1);
            expect(utilsFile).not.toContain('getKey');
        });
    });

    describe('Usage Validation', () => {
        it('should show help when no arguments provided', () => {
            const result = runExtractDefinition([]);

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('Usage');
        });

        it('should show help with only one argument', () => {
            const result = runExtractDefinition(['utils.ts']);

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('Usage');
        });
    });
});

