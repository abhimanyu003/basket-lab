// Configuration and Constants
const CONFIG = {
    CACHE_DURATION: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
    MAX_MEMORY_CACHE: 100, // Number of items in cache
    SEARCH_DEBOUNCE: 300, // ms
    MIN_SEARCH_LENGTH: 2,
    MAX_SEARCH_RESULTS: 10
};

const CACHE_KEYS = {
    FUNDS_LIST: 'mf_funds_list',
    FUNDS_TIMESTAMP: 'mf_funds_timestamp',
    NAV_PREFIX: 'mf_nav_'
};

// Professional Swatch Palette
const SWATCHES = [
    '#18181b', // Zinc
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#f43f5e'  // Rose
];

// TIME PERIODS
const PERIODS = ['1M', '2M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', 'Custom'];

// Default Funds
const FUNDS = [
    { id: '118741', name: 'Nippon India Index Fund - Nifty 50 Plan - Direct Plan Growth Plan' },
    { id: '148726', name: 'Nippon India Nifty Midcap 150 Index Fund - Direct Plan - Growth Option' },
    { id: '140088', name: 'Nippon India ETF Gold BeES' },
    { id: '143494', name: 'Nippon India Ultra Short Duration Fund Direct Growth' }
];

// Default Baskets
const DEFAULT_BASKETS = [
    { id: 1, name: 'Benchmark: Nifty 50', active: true, color: '#18181b', allocation: { '118741': 100 }, locks: {} },
    { id: 2, name: 'Aggressive: Nifty 50 + MidCap 150', active: true, color: '#2563eb', allocation: { '118741': 50, '148726': 50 }, locks: {} },
    { id: 3, name: 'Nifty 50 + MidCap 150 + GOLD', active: true, color: '#f59e0b', allocation: { '118741': 33, '148726': 33, '140088': 34 }, locks: {} },
    { id: 4, name: 'Nifty 50 + MidCap 150 + GOLD + Debt', active: true, color: '#10b981', allocation: { '118741': 20, '148726': 20, '140088': 30, '143494': 30 }, locks: {} }
];
