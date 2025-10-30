# Extract Definition - Recent Changes

## Fixed Issues

### 1. ✅ File Extension Conflict Prevention

**Problem:** The script could create files with different extensions but the same base name (e.g., `Rgb.ts` when `Rgb.tsx` already exists), causing import confusion.

**Example of the issue:**
```bash
# Rgb.tsx already exists
ls src/editor/Rgb.tsx  # exists

# Script tries to create Rgb.ts
pnpm extract-definition src/file.tsx SomeType src/editor/Rgb.ts
# ❌ Would create Rgb.ts, causing import ambiguity
```

**The confusion:**
```tsx
// Which file does this import from?
import {Rgb} from './Rgb';  // Rgb.ts or Rgb.tsx? 🤔
```

**Solution:** The script now:
- ✅ Checks for files with different extensions (`.ts`, `.tsx`, `.js`, `.jsx`) before creating
- ✅ Prevents creation with a clear error message
- ✅ In `fix-non-component-exports`: automatically uses the existing file's extension

**Now you get a helpful error:**
```bash
Error: Cannot create Rgb.ts because Rgb.tsx already exists.
Importing from files with different extensions can cause conflicts.
```

**In `fix-non-component-exports`:**
If `Rgb.tsx` exists and it wants to extract a type named `Rgb`, it will use `Rgb.tsx` as the target instead of creating `Rgb.ts`.

### 2. ✅ Multi-Line Import Handling

**Problem:** The script was breaking when encountering multi-line imports in files.

**Before:** The import detection used simple line-by-line regex, which would fail on code like:
```typescript
import {
    Route,
    createRoutesFromElements,
    RouterProvider,
    useLoaderData,
} from 'react-router-dom';
```

The script would:
- Only detect the first line of the import
- Insert new imports in the middle of existing multi-line imports
- Break the syntax

**After:** Now uses AST parsing to properly handle multi-line imports:
- ✅ Correctly identifies the end of multi-line import blocks
- ✅ Inserts new imports after the last complete import statement
- ✅ Preserves all existing import formatting

### 2. ✅ Removed Re-Export Behavior

**Before:** Extracted definitions were re-exported from the source file:
```typescript
// source.ts (after extraction)
export {formatDate} from './formatDate';  // ❌ Re-export
export function parseDate() { ... }
```

**After:** Extracted definitions are completely removed:
```typescript
// source.ts (after extraction)
export function parseDate() { ... }  // ✅ Just the remaining code
```

All references in other files are updated to import directly from the new file.

### 4. ✅ Same-File Dependencies with Auto-Export

**Problem:** When extracting a function that depends on another **non-exported** definition in the same file, the dependency wasn't handled and code would break.

**The Challenge:**
```typescript
// utils.ts
const a = 1;  // ❌ NOT exported
export const b = () => a;  // Uses non-exported 'a'
```

If you extract `b`, it needs `a`, but `a` isn't exported!

**Solution:** The script now:
1. ✅ Detects that `b` uses `a`
2. ✅ **Adds export to `a`** in the source file
3. ✅ Imports `a` in the new file
4. ✅ Shows clear warnings about what's happening

**After extracting `b`:**
```typescript
// b.ts
import {a} from './utils';  // ✅ Can import because 'a' is now exported!

export const b = () => a;

// utils.ts
export const a = 1;  // ✅ Now exported! (was: const a = 1;)
```

**Console output:**
```
⚠️  Warning: Extracted definitions depend on: a
   These are not exported: a
   Will add exports for them in the source file.
✓ Created b.ts
✓ Updated utils.ts
```

### Already-Exported Dependencies

If the dependency is **already exported**, no changes needed:
```typescript
// utils.ts
export const PREFIX = 'app';  // Already exported
export function getKey(id: string) {
    return `${PREFIX}_${id}`;
}
```

**After extracting `getKey`:**
```typescript
// getKey.ts
import {PREFIX} from './utils';  // ✅ Works because PREFIX is already exported

export function getKey(id: string) {
    return `${PREFIX}_${id}`;
}

// utils.ts
export const PREFIX = 'app';  // ✅ Stays as-is (already exported)
```

### 5. ✅ JSX Component Dependencies

**Problem:** When extracting code with JSX components, the script wasn't tracking component usage as dependencies.

**Example:**
```tsx
// router.tsx
export const router = createHashRouter(
    createRoutesFromElements([
        <Route index element={<Welcome />} />,
        <File gist dest={{...}} />
    ])
);
```

**Before:** The script wouldn't detect that `Welcome` and `File` are used as JSX components, resulting in missing imports.

**After:** Now properly tracks JSX component usage:
- ✅ Detects `<Welcome />` and adds `Welcome` to dependencies
- ✅ Detects `<File />` and adds `File` to dependencies
- ✅ Handles JSX member expressions like `<Foo.Bar />` (imports `Foo`)
- ✅ Automatically includes these in the imports for the new file

**Result:**
```tsx
// router.tsx (extracted file)
import {Welcome} from './Welcome';
import {File} from './File';
import {Route, createHashRouter, createRoutesFromElements} from 'react-router-dom';

export const router = createHashRouter(
    createRoutesFromElements([
        <Route index element={<Welcome />} />,
        <File gist dest={{...}} />
    ])
);
```

### 6. ✅ Automatic .tsx Extension for JSX Code

**Problem:** When extracting code containing JSX, the file needs a `.tsx` extension, not `.ts`.

**Solution:** The script now automatically detects JSX in the extracted code and changes the extension.

**Before:**
```bash
# User specifies .ts but code has JSX
pnpm extract-definition components.tsx Greeting Greeting.ts
# Would fail because JSX needs .tsx
```

**Now:**
```bash
pnpm extract-definition components.tsx Greeting Greeting.ts
# Auto-detects JSX and creates Greeting.tsx instead!
```

**Console output:**
```
✓ Found 1 definition(s)
⚠️  Extracted code contains JSX, changing extension: Greeting.ts → Greeting.tsx
✓ Created Greeting.tsx
✓ Updated components.tsx
```

**Example:**
```typescript
// components.tsx (before)
export const Greeting = ({name}: {name: string}) => {
    return <div>Hello {name}</div>;
};
```

After extraction:
- Creates `Greeting.tsx` (not .ts!)
- Works correctly with JSX syntax
- All imports updated to use correct extension

**Smart detection:**
- Detects JSX elements: `<div>`, `<Component />`
- Detects JSX fragments: `<>...</>`
- Only changes .ts → .tsx (won't change other extensions)
- If no JSX, keeps `.ts` extension as specified

## New Behavior Examples

### Example 1: Non-Exported Dependencies (The Classic Case)

**Before extraction:**
```typescript
// utils.ts
const a = 1;
export const b = () => a;
export function c() {
    return 'other';
}
```

**Command:**
```bash
pnpm extract-definition utils.ts b b.ts
```

**Console output:**
```
✓ Found 1 definition(s)
⚠️  Warning: Extracted definitions depend on: a
   These are not exported: a
   Will add exports for them in the source file.
✓ Created b.ts
✓ Updated utils.ts
✓ Updated 0 file(s)
```

**After extraction:**
```typescript
// b.ts (new file)
import {a} from './utils';

export const b = () => a;

// utils.ts (modified)
export const a = 1;  // ✅ NOW EXPORTED!
export function c() {
    return 'other';
}
// ✅ 'b' completely removed, no re-export
```

**What happened:**
1. Script detected `b` depends on `a`
2. Saw that `a` is NOT exported
3. Added `export` keyword to `a` in source file
4. Created `b.ts` with import for `a`
5. Removed `b` from source file completely

### Example 2: Simple Extraction

**Before extraction:**
```typescript
// utils.ts
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function parseDate(str: string): Date {
    return new Date(str);
}
```

**Command:**
```bash
pnpm extract-definition utils.ts formatDate formatDate.ts
```

**After extraction:**
```typescript
// formatDate.ts
export function formatDate(date: Date): string {
    return date.toISOString();
}

// utils.ts
export function parseDate(str: string): Date {
    return new Date(str);
}
// ✅ No re-export! formatDate is completely gone from utils.ts
```

**Files that imported from utils.ts:**
```typescript
// Before
import {formatDate, parseDate} from './utils';

// After
import {parseDate} from './utils';
import {formatDate} from './formatDate';  // ✅ Auto-updated!
```

### Example 2: With Same-File Dependencies

**Before extraction:**
```typescript
// config.ts
const API_BASE = 'https://api.example.com';

export function getEndpoint(path: string): string {
    return `${API_BASE}${path}`;
}

export function getAuthEndpoint(): string {
    return getEndpoint('/auth');
}
```

**Command:**
```bash
pnpm extract-definition config.ts getAuthEndpoint auth.ts
```

**Console output:**
```
✓ Found 1 definition(s)
⚠️  Warning: Extracted definitions depend on: getEndpoint
   Adding imports for these dependencies to the new file.
✓ Created auth.ts
✓ Updated config.ts
✓ Updated 3 file(s)
```

**After extraction:**
```typescript
// auth.ts
import {getEndpoint} from './config';  // ✅ Dependency auto-imported!

export function getAuthEndpoint(): string {
    return getEndpoint('/auth');
}

// config.ts
const API_BASE = 'https://api.example.com';

export function getEndpoint(path: string): string {
    return `${API_BASE}${path}`;
}
// ✅ getAuthEndpoint completely removed, no re-export
```

### Example 3: Source File Still Uses Extracted Definition

**Before extraction:**
```typescript
// validators.ts
export function isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

export function validateUser(email: string) {
    if (!isEmail(email)) {  // Uses isEmail locally
        throw new Error('Invalid email');
    }
    return true;
}
```

**Command:**
```bash
pnpm extract-definition validators.ts isEmail isEmail.ts
```

**Console output:**
```
✓ Found 1 definition(s)
✓ Created isEmail.ts
   Source file still uses: isEmail - adding import
✓ Updated validators.ts
```

**After extraction:**
```typescript
// isEmail.ts
export function isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

// validators.ts
import {isEmail} from './isEmail';  // ✅ Import added because it's still used!

export function validateUser(email: string) {
    if (!isEmail(email)) {
        throw new Error('Invalid email');
    }
    return true;
}
```

## Migration Notes

If you have code that was relying on re-exports from extracted definitions:

**Old behavior:**
```typescript
// Component.tsx exported Button
import {Button} from './Component';  // This worked with re-exports
```

**New behavior:**
```typescript
// Import directly from the extracted file (auto-updated!)
import {Button} from './Button';
```

All imports are automatically updated, so no manual changes needed! 🎉

## Benefits

1. **Cleaner code** - No leftover re-exports cluttering files
2. **Clear dependencies** - Explicit imports show where things come from
3. **Better organization** - Extracted code is truly separated
4. **Handles edge cases** - Same-file dependencies and local usage work correctly
5. **No breaking changes** - All imports are automatically updated

## Testing

Run the test suite to verify behavior:
```bash
pnpm test:extract
```

See `TESTING.md` for more details on the test coverage.

