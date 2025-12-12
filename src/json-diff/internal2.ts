// biome-ignore-all lint/suspicious/noExplicitAny : this is internal and fine

import {PathSegment} from './helper2';

export function _get(base: any, at: PathSegment[]) {
    for (let i = 0; i < at.length; i++) {
        const key = at[i];
        if (!base) {
            throw new Error(`missing base ${at.join(',')}`);
        }
        if (key.type === 'tag') {
            if (!(key.key in base)) {
                throw new Error(`Not a tagged union with tag "${key.key}"`);
            }
            if (base[key.key] !== key.value) {
                throw new Error(
                    `Tagged union has wrong tag "${key.key}"="${base[key.key]}", expected "${key.value}"`,
                );
            }
            continue;
        }
        if (key.type === 'single') {
            const isArray = Array.isArray(base);
            if (key.isSingle && isArray) {
                throw new Error(`Expected a single value but found an array`);
            }
            if (!key.isSingle && !isArray) {
                throw new Error(`Expected an array but found a single value`);
            }
            continue;
        }
        if (Array.isArray(base)) {
            if (typeof key.key !== 'number') {
                throw new Error(`invalid key for array: ${key.key}`);
            }
        } else if (typeof base !== 'object') {
            throw new Error(`base is not object`);
        }
        base = base[key.key];
    }
    return base;
}

function _getCloned(root: any, at: PathSegment[]) {
    root = Array.isArray(root) ? root.slice() : {...root};
    let base = root;
    for (let i = 0; i < at.length; i++) {
        const key = at[i];
        if (!base) {
            throw new Error(`missing base ${at.join(',')}`);
        }
        if (key.type === 'tag') {
            if (!(key.key in base)) {
                throw new Error(`Not a tagged union with tag "${key.key}"`);
            }
            if (base[key.key] !== key.value) {
                throw new Error(
                    `Tagged union has wrong tag "${key.key}"="${base[key.key]}", expected "${key.value}"`,
                );
            }
            continue;
        }
        if (key.type === 'single') {
            const isArray = Array.isArray(base);
            if (key.isSingle && isArray) {
                throw new Error(`Expected a single value but found an array`);
            }
            if (!key.isSingle && !isArray) {
                throw new Error(`Expected an array but found a single value`);
            }
            continue;
        }
        if (Array.isArray(base)) {
            if (typeof key.key !== 'number') {
                throw new Error(`invalid key for array: ${key.key}`);
            }
        } else if (typeof base !== 'object') {
            throw new Error(`base is not object`);
        }
        base[key.key] = Array.isArray(base[key.key]) ? base[key.key].slice() : {...base[key.key]};
        base = base[key.key];
    }
    return {root, base};
}

export function _replace(
    base: any,
    at: PathSegment[],
    previous: any,
    value: any,
    equal: (a: any, b: any) => boolean,
) {
    if (!at.length) {
        if (!equal(previous, base)) {
            throw new Error(`cannot apply, previous is different`);
        }
        return value;
    }
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (key.type !== 'key') throw new Error(`weird final key type while replacing ${key.type}`);
    if (Array.isArray(base)) {
        if (typeof key.key !== 'number') {
            throw new Error(`invalid key for array: ${key.key}`);
        }
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    }
    if (!equal(previous, base[key.key])) {
        // console.log(previous, base[key.key], key);
        throw new Error(`cannot apply, previous is different from expected`);
    }
    base[key.key] = value;
    return root;
}

export function _add(base: any, at: PathSegment[], value: any) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (key.type !== 'key') throw new Error(`weird final key type while adding ${key.type}`);
    if (Array.isArray(base)) {
        if (typeof key.key !== 'number') {
            throw new Error(`invalid key for array: ${key.key}`);
        }
        base.splice(key.key, 0, value);
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    } else if (key.key in base) {
        throw new Error(`key "${key}" already exists, cannot add, must replace`);
    } else {
        base[key.key] = value;
    }
    return root;
}

export function _remove(
    base: any,
    at: PathSegment[],
    value: any,
    equal: (a: any, b: any) => boolean,
) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (key.type !== 'key') throw new Error(`weird final key type while removing ${key.type}`);
    if (!equal(value, base[key.key])) {
        throw new Error(`remove, value not equal what's there`);
    }
    if (Array.isArray(base)) {
        if (typeof key.key !== 'number') {
            throw new Error(`invalid key for array: ${key.key}`);
        }
        base.splice(key.key, 1);
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    } else if (!(key.key in base)) {
        throw new Error(`key "${key}" doesn't exist in base`);
    } else {
        delete base[key.key];
    }
    return root;
}
