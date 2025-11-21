// biome-ignore-all lint/suspicious/noExplicitAny : this is internal and fine

export const parsePath = (at: string) =>
    at
        .split('/')
        .filter(Boolean)
        .map((p) => (Number.isInteger(+p) ? +p : p));
export function _get(base: any, at: (number | string)[]) {
    for (let i = 0; i < at.length; i++) {
        const key = at[i];
        if (!base) {
            throw new Error(`missing base`);
        }
        if (Array.isArray(base)) {
            if (typeof key !== 'number') {
                throw new Error(`invalid key for array`);
            }
        } else if (typeof base !== 'object') {
            throw new Error(`base is not object`);
        }
        base = base[key];
    }
    return base;
}
function _getCloned(root: any, at: (number | string)[]) {
    root = Array.isArray(root) ? root.slice() : {...root};
    let base = root;
    for (let i = 0; i < at.length; i++) {
        const key = at[i];
        if (!base) {
            throw new Error(`missing base`);
        }
        if (Array.isArray(base)) {
            if (typeof key !== 'number') {
                throw new Error(`invalid key for array`);
            }
        } else if (typeof base !== 'object') {
            throw new Error(`base is not object`);
        }
        base[key] = Array.isArray(base[key]) ? base[key].slice() : {...base[key]};
        base = base[key];
    }
    return {root, base};
}
export function _replace(
    base: any,
    at: (number | string)[],
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
    if (Array.isArray(base)) {
        if (typeof key !== 'number') {
            throw new Error(`invalid key for array`);
        }
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    }
    if (!equal(previous, base[key])) {
        console.log(previous, base[key], key);
        throw new Error(`cannot apply, previous is different`);
    }
    base[key] = value;
    return root;
}
export function _add(base: any, at: (number | string)[], value: any) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (Array.isArray(base)) {
        if (typeof key !== 'number') {
            throw new Error(`invalid key for array`);
        }
        base.splice(key, 0, value);
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    } else if (key in base) {
        throw new Error(`key "${key}" already exists, cannot add, must replace`);
    } else {
        base[key] = value;
    }
    return root;
}
export function _remove(
    base: any,
    at: (number | string)[],
    value: any,
    equal: (a: any, b: any) => boolean,
) {
    let root: any;
    ({root, base} = _getCloned(base, at.slice(0, -1)));
    const key = at[at.length - 1];
    if (!equal(value, base[key])) {
        throw new Error(`remove, value not equal what's there`);
    }
    if (Array.isArray(base)) {
        if (typeof key !== 'number') {
            throw new Error(`invalid key for array`);
        }
        base.splice(key, 1);
    } else if (typeof base !== 'object') {
        throw new Error(`base is not object`);
    } else if (!(key in base)) {
        throw new Error(`key "${key}" doesn't exist in base`);
    } else {
        delete base[key];
    }
    return root;
}
