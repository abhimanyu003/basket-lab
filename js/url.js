// URL Management and Sharing

function sanitizeString(str, maxLength = 200) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'"]/g, '').substring(0, maxLength);
}

function sanitizeColor(color) {
    if (typeof color !== 'string') return '#18181b';
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
    return '#18181b';
}

function sanitizeNumber(num, min, max, defaultVal) {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return defaultVal;
    return Math.max(min, Math.min(max, parsed));
}

function updateURLWithSettings() {
    if (isInitializing) return;
    
    try {
        const settings = {
            mode: ['lumpsum', 'sip'].includes(investmentMode) ? investmentMode : 'lumpsum',
            amount: sanitizeNumber(parseFloat(document.getElementById('global-amount').value), 1000, 1000000000, 100000),
            period: PERIODS.includes(selectedPeriod) ? selectedPeriod : '1Y',
            customStart: customStartDate ? customStartDate.toISOString().split('T')[0] : null,
            customEnd: customEndDate ? customEndDate.toISOString().split('T')[0] : null,
            baskets: baskets.map(b => ({
                id: typeof b.id === 'number' ? b.id : 1,
                name: sanitizeString(b.name, 100),
                active: Boolean(b.active),
                color: sanitizeColor(b.color),
                allocation: Object.fromEntries(
                    Object.entries(b.allocation)
                        .filter(([k, v]) => /^\d+$/.test(k) && typeof v === 'number' && v >= 0 && v <= 100)
                        .map(([k, v]) => [k, parseFloat(v.toFixed(2))])
                ),
                locks: b.locks || {}
            })).filter(b => Object.keys(b.allocation).length > 0)
        };
        
        const encoded = btoa(JSON.stringify(settings));
        const url = new URL(window.location.href);
        url.searchParams.set('config', encoded);
        
        window.history.replaceState({}, '', url.toString());
        updateShareURLInput();
    } catch (e) {
        console.error('Failed to update URL:', e);
    }
}

function updateShareURLInput() {
    const input = document.getElementById('share-url-input');
    if (input) {
        input.value = window.location.href;
    }
}

function loadSettingsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const config = urlParams.get('config');
    
    if (!config) return false;
    
    try {
        if (!/^[A-Za-z0-9+/=]+$/.test(config)) {
            console.error('Invalid config format');
            return false;
        }
        
        const settings = JSON.parse(atob(config));
        
        if (settings.mode && ['lumpsum', 'sip'].includes(settings.mode)) {
            investmentMode = settings.mode;
            setMode(settings.mode);
        }
        
        if (settings.amount) {
            const sanitizedAmount = sanitizeNumber(settings.amount, 1000, 1000000000, 100000);
            document.getElementById('global-amount').value = sanitizedAmount;
        }
        
        if (settings.period && PERIODS.includes(settings.period)) {
            selectedPeriod = settings.period;
        }
        
        if (settings.customStart && settings.customEnd) {
            try {
                customStartDate = new Date(settings.customStart);
                customEndDate = new Date(settings.customEnd);
                if (selectedPeriod === 'Custom') {
                    showCustomDatePicker();
                }
            } catch (e) {
                console.error('Invalid custom dates:', e);
                customStartDate = null;
                customEndDate = null;
            }
        }
        
        if (settings.baskets && Array.isArray(settings.baskets)) {
            baskets = settings.baskets.map((b, index) => {
                if (!b || typeof b !== 'object') return null;
                
                const sanitizedBasket = {
                    id: (typeof b.id === 'number' && b.id > 0) ? Math.abs(Math.floor(b.id)) : (index + 1),
                    name: sanitizeString(b.name, 100) || 'Unnamed Basket',
                    active: Boolean(b.active),
                    color: sanitizeColor(b.color),
                    allocation: {},
                    locks: {}
                };
                
                if (b.allocation && typeof b.allocation === 'object') {
                    for (const [fundId, weight] of Object.entries(b.allocation)) {
                        if (/^\d+$/.test(fundId)) {
                            const sanitizedWeight = sanitizeNumber(weight, 0, 100, 0);
                            sanitizedBasket.allocation[fundId] = sanitizedWeight;
                        }
                    }
                }
                
                if (b.locks && typeof b.locks === 'object') {
                    for (const [fundId, locked] of Object.entries(b.locks)) {
                        if (/^\d+$/.test(fundId) && locked === true) {
                            sanitizedBasket.locks[fundId] = true;
                        }
                    }
                }
                
                return sanitizedBasket;
            }).filter(b => b !== null && Object.keys(b.allocation).length > 0);
            
            if (baskets.length === 0) {
                baskets = JSON.parse(JSON.stringify(DEFAULT_BASKETS));
            } else {
                baskets = baskets.map((b, index) => ({
                    ...b,
                    id: index + 1
                }));
            }
            window.baskets = baskets;
        }
        
        return true;
    } catch (e) {
        console.error('Failed to load settings from URL:', e);
        return false;
    }
}
