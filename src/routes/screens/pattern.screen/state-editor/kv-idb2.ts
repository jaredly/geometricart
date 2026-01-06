/* Typed “tables” on top of a single IndexedDB objectStore using compound keys [table, key].

   - Compile-time: table name -> value type
   - Runtime: validators map table name -> type-guard function
   - On read: values are validated; by default invalid data throws (configurable)

   Requirements: "dom" lib in TS (for IDB types).
*/

export type TableName = string;
export type KVKey = IDBValidKey; // string | number | Date | Array | ...

type CompoundKey = [TableName, KVKey];

export type Validator<T> = (value: unknown) => value is T;

export type TableSpec<TTables extends Record<string, any>> = {
    [K in keyof TTables]: Validator<TTables[K]>;
};

export interface TypedKVOptions {
    dbName?: string;
    storeName?: string;
    version?: number;

    /** What to do if a value is present but fails validation */
    onInvalidValue?: 'throw' | 'undefined';
}

export class TypedKV<TTables extends Record<string, any>> {
    private dbName: string;
    private storeName: string;
    private version: number;
    private onInvalidValue: 'throw' | 'undefined';

    private db: IDBDatabase | null = null;
    private opening: Promise<IDBDatabase> | null = null;

    private validators: TableSpec<TTables>;

    constructor(validators: TableSpec<TTables>, opts: TypedKVOptions = {}) {
        this.validators = validators;
        this.dbName = opts.dbName ?? 'kv-db';
        this.storeName = opts.storeName ?? 'kv';
        this.version = opts.version ?? 1;
        this.onInvalidValue = opts.onInvalidValue ?? 'throw';
    }

    private makeKey<K extends keyof TTables>(table: K, key: KVKey): CompoundKey {
        return [String(table), key];
    }

    private reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    private txDone(tx: IDBTransaction): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
        });
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        if (this.opening) return this.opening;

        this.opening = new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);

            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            req.onsuccess = () => {
                const db = req.result;

                db.onversionchange = () => {
                    db.close();
                    this.db = null;
                    this.opening = null;
                };

                this.db = db;
                this.opening = null;
                resolve(db);
            };

            req.onerror = () => {
                this.opening = null;
                reject(req.error);
            };

            req.onblocked = () => {
                this.opening = null;
                reject(
                    new Error(
                        'IndexedDB open/upgrade blocked (another tab may still be holding the DB).',
                    ),
                );
            };
        });

        return this.opening;
    }

    /** Put / overwrite a value */
    async set<K extends keyof TTables>(table: K, key: KVKey, value: TTables[K]): Promise<void> {
        // Optional: validate on write too (cheap safety)
        const isOk = this.validators[table](value as unknown);
        if (!isOk) {
            throw new Error(
                `Validation failed for table "${String(table)}" (refusing to store value).`,
            );
        }

        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(value as any, this.makeKey(table, key));
        await this.txDone(tx);
    }

    /** Get a value (undefined if missing; invalid values -> throw or undefined depending on config) */
    async get<K extends keyof TTables>(table: K, key: KVKey): Promise<TTables[K] | undefined> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);

        const raw = await this.reqToPromise<any>(store.get(this.makeKey(table, key)));
        await this.txDone(tx);

        if (raw === undefined) return undefined;

        const ok = this.validators[table](raw);
        if (ok) return raw;

        if (this.onInvalidValue === 'undefined') return undefined;

        throw new Error(
            `Invalid stored value for table "${String(table)}" and key ${JSON.stringify(key)} (failed validation).`,
        );
    }

    /** List [key, value] pairs in a table (values validated & typed) */
    async entries<K extends keyof TTables>(table: K): Promise<Array<[KVKey, TTables[K]]>> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);

        const t = String(table);
        const range = IDBKeyRange.bound([t], [t, []]);

        // Get all compound keys + all values for the table range.
        // IndexedDB guarantees both are ordered by key, so indices align.
        const [allKeys, allValues] = await Promise.all([
            this.reqToPromise<IDBValidKey[]>(store.getAllKeys(range)),
            this.reqToPromise<any[]>(store.getAll(range)),
        ]);

        await this.txDone(tx);

        const validate = this.validators[table];
        const out: Array<[KVKey, TTables[K]]> = [];

        const n = Math.min(allKeys.length, allValues.length);
        for (let i = 0; i < n; i++) {
            const ck = allKeys[i];
            if (!Array.isArray(ck) || ck.length < 2) continue;

            const innerKey = (ck as unknown as [string, KVKey])[1];
            const rawVal = allValues[i];

            if (rawVal === undefined) continue;

            if (validate(rawVal)) {
                out.push([innerKey, rawVal]);
            } else {
                if (this.onInvalidValue === 'throw') {
                    throw new Error(
                        `Invalid stored value for table "${t}" at key ${JSON.stringify(innerKey)} (failed validation).`,
                    );
                }
                // onInvalidValue === "undefined" => skip invalid entries
            }
        }

        return out;
    }

    /** Delete a single key */
    async del<K extends keyof TTables>(table: K, key: KVKey): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(this.makeKey(table, key));
        await this.txDone(tx);
    }

    /** List keys in a table (returns the “inner” keys, not [table,key]) */
    async keys<K extends keyof TTables>(table: K): Promise<KVKey[]> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);

        const t = String(table);

        // All compound keys with first element === t
        const range = IDBKeyRange.bound([t], [t, []]);

        const all = await this.reqToPromise<IDBValidKey[]>(store.getAllKeys(range));
        await this.txDone(tx);

        return all
            .map((k) => (Array.isArray(k) ? (k as unknown as CompoundKey)[1] : undefined))
            .filter((k): k is KVKey => k !== undefined);
    }

    /** Delete everything in a table */
    async clear<K extends keyof TTables>(table: K): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        const t = String(table);
        const range = IDBKeyRange.bound([t], [t, []]);
        store.delete(range);

        await this.txDone(tx);
    }

    /** Optional: close the underlying connection */
    close(): void {
        this.db?.close();
        this.db = null;
        this.opening = null;
    }
}

/* --------------------------
   Example usage
--------------------------- */

// // 1) Define your schema: table name -> value type
// type MyTables = {
//     images: Blob;
//     userSettings: {theme: 'light' | 'dark'; fontSize: number};
//     cache: ArrayBuffer;
// };

// // 2) Define validators (runtime type guards)
// const isBlob: Validator<Blob> = (v: unknown): v is Blob => v instanceof Blob;

// const isUserSettings: Validator<MyTables['userSettings']> = (
//     v: unknown,
// ): v is MyTables['userSettings'] => {
//     if (typeof v !== 'object' || v === null) return false;
//     const o = v as any;
//     return (o.theme === 'light' || o.theme === 'dark') && typeof o.fontSize === 'number';
// };

// const isArrayBuffer: Validator<ArrayBuffer> = (v: unknown): v is ArrayBuffer =>
//     v instanceof ArrayBuffer;

// // 3) Create the store with typed mapping + validators
// export const kv = new TypedKV<MyTables>(
//     {
//         images: isBlob,
//         userSettings: isUserSettings,
//         cache: isArrayBuffer,
//     },
//     {dbName: 'app-db', storeName: 'kv', onInvalidValue: 'throw'},
// );

// // 4) Fully typed calls
// async function demo(blob: Blob) {
//     await kv.set('images', 'avatar', blob); // value must be Blob
//     const b = await kv.get('images', 'avatar'); // Blob | undefined

//     await kv.set('userSettings', 'main', {theme: 'dark', fontSize: 14});
//     const s = await kv.get('userSettings', 'main'); // {theme,...} | undefined

//     await kv.del('images', 'avatar');
//     const imageKeys = await kv.keys('images'); // KVKey[]
//     await kv.clear('cache');
// }
