let DB = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MutualFundDB', 1);
        
        request.onerror = () => {
            console.warn('IndexedDB not available, will skip caching');
            resolve(null);
        };
        
        request.onsuccess = (event) => {
            DB = event.target.result;
            console.log('IndexedDB initialized');
            resolve(DB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('funds')) {
                db.createObjectStore('funds', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('navData')) {
                db.createObjectStore('navData', { keyPath: 'fundId' });
            }
        };
    });
}

async function setIndexedDBCache(storeName, key, data) {
    if (!DB) return;
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = DB.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const cacheData = {
                id: key,
                fundId: key,
                data: data,
                timestamp: Date.now()
            };
            const request = store.put(cacheData);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                console.warn('Failed to save to IndexedDB:', request.error);
                resolve(false);
            };
        } catch (e) {
            console.warn('IndexedDB error:', e);
            resolve(false);
        }
    });
}

async function getIndexedDBCache(storeName, key) {
    if (!DB) return null;
    
    return new Promise((resolve) => {
        try {
            const transaction = DB.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }
                
                const age = Date.now() - result.timestamp;
                
                // Check if cache is expired (older than 8 hours)
                if (age > CONFIG.CACHE_DURATION) {
                    // Delete expired cache
                    const deleteTransaction = DB.transaction([storeName], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore(storeName);
                    deleteStore.delete(key);
                    resolve(null);
                    return;
                }
                
                resolve(result.data);
            };
            
            request.onerror = () => {
                console.warn('Failed to read from IndexedDB:', request.error);
                resolve(null);
            };
        } catch (e) {
            console.warn('IndexedDB error:', e);
            resolve(null);
        }
    });
}

// Clean up expired IndexedDB entries periodically
async function cleanupExpiredCaches() {
    if (!DB) return;
    
    try {
        const stores = ['funds', 'navData'];
        let totalCleaned = 0;
        
        for (const storeName of stores) {
            const transaction = DB.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const age = Date.now() - cursor.value.timestamp;
                    if (age > CONFIG.CACHE_DURATION) {
                        cursor.delete();
                        totalCleaned++;
                    }
                    cursor.continue();
                }
            };
        }
        
        if (totalCleaned > 0) {
            console.log(`Cleaned up ${totalCleaned} expired cache entries`);
        }
    } catch (e) {
        console.warn('Failed to cleanup expired caches:', e);
    }
}
