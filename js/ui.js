// UI Management and Interactions

let editingBasketId = null;
let isInitializing = true;
let modalFundsState = [];
let searchTimeout = null;

// Status indicator
function updateStatus(type, message) {
    const statusEl = document.getElementById('status-indicator');
    const icons = {
        loading: '<span class="relative flex h-2 w-2 mr-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>',
        ready: '<span class="relative flex h-2 w-2 mr-2"><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>',
        error: '<span class="relative flex h-2 w-2 mr-2"><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>'
    };
    statusEl.innerHTML = (icons[type] || '') + message;
}

// Input validation
function validateAmountInput(input) {
    let value = input.value;
    const errorEl = document.getElementById('amount-error');
    
    value = value.replace(/[^\d]/g, '');
    input.value = value;
    
    const numValue = parseInt(value);
    if (value !== '' && numValue < 100) {
        input.classList.remove('border-zinc-200', 'focus-visible:ring-zinc-950');
        input.classList.add('border-red-500', 'focus-visible:ring-red-500');
        errorEl.classList.remove('hidden');
    } else {
        input.classList.remove('border-red-500', 'focus-visible:ring-red-500');
        input.classList.add('border-zinc-200', 'focus-visible:ring-zinc-950');
        errorEl.classList.add('hidden');
    }
}

// Toast notification
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const icon = toast.querySelector('svg');
    
    toastMessage.textContent = message;
    
    if (isSuccess) {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
        icon.classList.add('text-emerald-400');
        icon.classList.remove('text-red-400');
    } else {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
        icon.classList.add('text-red-400');
        icon.classList.remove('text-emerald-400');
    }
    
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Period selector
function updatePeriodLabels(selectedPeriod) {
    const periodMap = {
        '1M': '1 Month', '2M': '2 Months', '3M': '3 Months',
        '6M': '6 Months', '1Y': '1 Year', '2Y': '2 Years',
        '3Y': '3 Years', '5Y': '5 Years', '7Y': '7 Years', '10Y': '10 Years'
    };
    
    let label = periodMap[selectedPeriod] || selectedPeriod;
    
    if (selectedPeriod === 'Custom' && customStartDate && customEndDate) {
        const formatDate = (date) => {
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        };
        label = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;
    }
    
    document.getElementById('summary-period').textContent = `(${label})`;
    document.getElementById('portfolio-period').textContent = `(${label})`;
    document.getElementById('drawdown-period').textContent = `(${label})`;
}

// Modal functions
function openModal(id = null) {
    editingBasketId = id;
    document.getElementById('modal-overlay').classList.remove('hidden');
    const b = id ? window.baskets.find(x => x.id === id) : { name: "New Strategy", allocation: {}, color: SWATCHES[7], locks: {} };
    document.getElementById('modal-basket-name').value = b.name;
    document.getElementById('modal-basket-color').value = b.color;
    
    modalFundsState = [];
    for (const [fundId, weight] of Object.entries(b.allocation)) {
        let fund = FUNDS.find(f => f.id === fundId);
        if (!fund && ALL_FUNDS_CACHE) {
            const cachedFund = ALL_FUNDS_CACHE.find(f => f.schemeCode == fundId);
            if (cachedFund) {
                fund = { id: String(cachedFund.schemeCode), name: cachedFund.schemeName };
                FUNDS.push(fund);
            }
        }
        
        if (fund) {
            const isLocked = b.locks && b.locks[fundId] === true;
            modalFundsState.push({ id: fund.id, name: fund.name, weight: weight, locked: isLocked });
        }
    }
    
    renderSwatches();
    renderModalInputs();
    document.addEventListener('keydown', handleModalEscape);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.removeEventListener('keydown', handleModalEscape);
}

function handleModalEscape(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}

// Swatch selection
function selectSwatch(color) {
    document.getElementById('modal-basket-color').value = color;
    renderSwatches();
}

function renderSwatches() {
    const container = document.getElementById('color-swatch-container');
    const selected = document.getElementById('modal-basket-color').value;
    
    container.innerHTML = SWATCHES.map(c => `
        <div onclick="selectSwatch('${c}')" 
             class="h-6 w-6 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ${selected === c ? 'ring-2 ring-offset-2 ring-zinc-900' : ''}" 
             style="background-color: ${c}">
             ${selected === c ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
        </div>
    `).join('');
}

// Search functions
function handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length < CONFIG.MIN_SEARCH_LENGTH) {
        document.getElementById('search-results').classList.add('hidden');
        return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => executeSearch(query), CONFIG.SEARCH_DEBOUNCE);
}

async function executeSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<div class="p-3 text-sm text-zinc-500">Searching...</div>';
    resultsContainer.classList.remove('hidden');
    
    try {
        if (!FUSE_INSTANCE) {
            await fetchAllFundsList();
        }
        
        if (!FUSE_INSTANCE) {
            resultsContainer.innerHTML = '<div class="p-3 text-sm text-red-500">Fund database not loaded. Please refresh.</div>';
            return;
        }
        
        const searchResults = FUSE_INSTANCE.search(query, { limit: CONFIG.MAX_SEARCH_RESULTS });
        
        if (searchResults.length > 0) {
            const htmlParts = [];
            const queryLower = query.toLowerCase();
            
            for (const result of searchResults) {
                const fund = result.item;
                const score = result.score;
                
                let displayName = fund.schemeName;
                const nameLower = displayName.toLowerCase();
                const index = nameLower.indexOf(queryLower);
                
                if (index !== -1) {
                    const before = displayName.substring(0, index);
                    const match = displayName.substring(index, index + query.length);
                    const after = displayName.substring(index + query.length);
                    displayName = `${before}<mark class="bg-yellow-200 text-zinc-900 font-semibold">${match}</mark>${after}`;
                }
                
                htmlParts.push(`
                <div onclick="addFundToModal('${fund.schemeCode}', '${fund.schemeName.replace(/'/g, "").replace(/"/g, "&quot;")}')" 
                     class="p-3 hover:bg-blue-50 cursor-pointer border-b border-zinc-100 last:border-0 transition-colors group">
                    <div class="font-medium text-zinc-900 text-sm leading-snug mb-1.5 group-hover:text-blue-700">${displayName}</div>
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                            Code: ${fund.schemeCode}
                        </span>
                        <span class="text-xs text-zinc-400">Match: ${Math.round((1 - score) * 100)}%</span>
                    </div>
                </div>`);
            }
            
            resultsContainer.innerHTML = htmlParts.join('');
        } else {
            resultsContainer.innerHTML = '<div class="p-3 text-sm text-zinc-500">No funds found. Try different keywords.</div>';
        }
    } catch (err) {
        console.error('Search error:', err);
        resultsContainer.innerHTML = '<div class="p-3 text-sm text-red-500">Error searching funds.</div>';
    }
}

function addFundToModal(code, name) {
    if (!FUNDS.find(f => f.id == code)) FUNDS.push({ id: String(code), name: name });
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('fund-search-input').value = '';
    if (!modalFundsState.find(f => f.id == code)) {
        modalFundsState.push({ id: String(code), name: name, weight: 0, locked: false });
        renderModalInputs();
    }
}
