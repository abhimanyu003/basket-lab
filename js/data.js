// Data Fetching and Management
const NAV_CACHE = {};
const NAV_CACHE_QUEUE = [];
let ALL_FUNDS_CACHE = null;
let FUSE_INSTANCE = null;

// LRU Cache Management
function addToMemoryCache(fundId, data) {
    NAV_CACHE[fundId] = data;
    
    const existingIndex = NAV_CACHE_QUEUE.indexOf(fundId);
    if (existingIndex > -1) {
        NAV_CACHE_QUEUE.splice(existingIndex, 1);
    }
    NAV_CACHE_QUEUE.push(fundId);
    
    if (NAV_CACHE_QUEUE.length > CONFIG.MAX_MEMORY_CACHE) {
        const oldestFundId = NAV_CACHE_QUEUE.shift();
        delete NAV_CACHE[oldestFundId];
        console.log(`Evicted ${oldestFundId} from memory cache (LRU)`);
    }
}

// Fetch all funds list
async function fetchAllFundsList() {
    if (ALL_FUNDS_CACHE) return ALL_FUNDS_CACHE;
    
    const cachedFunds = await getIndexedDBCache('funds', 'allFunds');
    if (cachedFunds && Array.isArray(cachedFunds) && cachedFunds.length > 0) {
        console.log(`Loaded ${cachedFunds.length} funds from IndexedDB cache`);
        ALL_FUNDS_CACHE = cachedFunds;
        initFuseSearch();
        return ALL_FUNDS_CACHE;
    }
    
    try {
        updateStatus('loading', 'Downloading Fund Database...');
        const response = await fetch('https://api.mfapi.in/mf');
        const data = await response.json();
        ALL_FUNDS_CACHE = data;
        
        await setIndexedDBCache('funds', 'allFunds', data);
        initFuseSearch();
        console.log(`Fetched and cached ${ALL_FUNDS_CACHE.length} mutual funds`);
        return ALL_FUNDS_CACHE;
    } catch (e) {
        console.error('Error fetching all funds:', e);
        return [];
    }
}

// Initialize Fuse.js search
function initFuseSearch() {
    const fuseOptions = {
        keys: [
            { name: 'schemeName', weight: 0.7 },
            { name: 'schemeCode', weight: 0.3 }
        ],
        threshold: 0.3,
        distance: 50,
        minMatchCharLength: 2,
        ignoreLocation: true,
        useExtendedSearch: false,
        includeScore: true,
        shouldSort: true,
        findAllMatches: false,
        isCaseSensitive: false
    };
    FUSE_INSTANCE = new Fuse(ALL_FUNDS_CACHE, fuseOptions);
}

// Fetch individual fund NAV data
async function fetchFundData(fundId) {
    if (NAV_CACHE[fundId]) {
        const existingIndex = NAV_CACHE_QUEUE.indexOf(fundId);
        if (existingIndex > -1) {
            NAV_CACHE_QUEUE.splice(existingIndex, 1);
            NAV_CACHE_QUEUE.push(fundId);
        }
        return;
    }
    
    const cachedNav = await getIndexedDBCache('navData', fundId);
    
    if (cachedNav && Array.isArray(cachedNav) && cachedNav.length > 0) {
        const parsedData = cachedNav.map(d => ({
            date: new Date(d.date),
            nav: d.nav
        }));
        addToMemoryCache(fundId, parsedData);
        console.log(`Loaded NAV data for ${fundId} from IndexedDB`);
        return;
    }
    
    try {
        const response = await fetch(`https://api.mfapi.in/mf/${fundId}`);
        const data = await response.json();
        if (data.status === "SUCCESS" || data.meta) {
            const parsedData = data.data.map(d => {
                const [day, month, year] = d.date.split('-');
                return { date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), nav: parseFloat(d.nav) };
            }).sort((a, b) => a.date - b.date);
            
            addToMemoryCache(fundId, parsedData);
            
            const cacheData = parsedData.map(d => ({
                date: d.date.toISOString(),
                nav: d.nav
            }));
            await setIndexedDBCache('navData', fundId, cacheData);
            console.log(`Fetched and cached NAV data for ${fundId}`);
        }
    } catch (e) {
        console.error(`Error fetching ${fundId}`, e);
    }
}

// Fetch all required data
async function fetchAllData(baskets) {
    updateStatus('loading', 'Fetching Data...');
    
    await initIndexedDB();
    cleanupExpiredCaches();
    
    const fundsListPromise = fetchAllFundsList();
    
    const allFundIds = new Set();
    baskets.forEach(b => Object.keys(b.allocation).forEach(id => allFundIds.add(id)));
    FUNDS.forEach(f => allFundIds.add(f.id));
    
    await Promise.all([
        fundsListPromise,
        ...Array.from(allFundIds).map(id => fetchFundData(id))
    ]);
    
    updateStatus('ready', 'System Ready');
}
