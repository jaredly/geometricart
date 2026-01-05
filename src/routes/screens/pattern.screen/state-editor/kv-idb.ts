function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('kv-db', 1);

        req.onupgradeneeded = () => {
            req.result.createObjectStore('kv');
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function set(key: string, value: Blob) {
    const db = await openDB();
    const tx = db.transaction('kv', 'readwrite');

    return new Promise((res) => {
        tx.oncomplete = res;
        tx.objectStore('kv').put(value, key);
    });
}

export async function get(key: string) {
    const db = await openDB();
    const tx = db.transaction('kv', 'readonly');

    return new Promise<Blob>((resolve) => {
        const req = tx.objectStore('kv').get(key);
        req.onsuccess = () => resolve(req.result);
    });
}

export async function del(key: string) {
    const db = await openDB();
    const tx = db.transaction('kv', 'readwrite');

    return new Promise((resolve, reject) => {
        tx.objectStore('kv').delete(key);
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
    });
}
