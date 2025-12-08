// Main Application Logic

// Global state
let baskets = JSON.parse(JSON.stringify(DEFAULT_BASKETS));
let selectedPeriod = '3Y';
let customStartDate = null;
let customEndDate = null;
let investmentMode = 'lumpsum';
let currentSort = { key: null, direction: 'desc' };
let currentAnalysisResults = [];

// Expose to window for HTML onclick handlers
window.baskets = baskets;
window.setMode = setMode;
window.setPeriod = setPeriod;
window.updateAnalysis = updateAnalysis;
window.toggleSort = toggleSort;
window.openModal = openModal;
window.closeModal = closeModal;
window.selectSwatch = selectSwatch;
window.handleSearch = handleSearch;
window.addFundToModal = addFundToModal;
window.deleteFund = deleteFund;
window.toggleLock = toggleLock;
window.handleWeightChange = handleWeightChange;
window.saveBasketFromModal = saveBasketFromModal;
window.toggleBasket = toggleBasket;
window.editBasket = editBasket;
window.duplicateBasket = duplicateBasket;
window.deleteBasket = deleteBasket;
window.resetBaskets = resetBaskets;
window.shareSettings = shareSettings;
window.copyShareURL = copyShareURL;
window.validateAmountInput = validateAmountInput;
window.renderBasketList = renderBasketList;
window.showCustomDatePicker = showCustomDatePicker;
window.hideCustomDatePicker = hideCustomDatePicker;
window.applyCustomDates = applyCustomDates;

// Mode switching
function setMode(mode) {
    investmentMode = mode;
    const activeClass = "bg-white text-zinc-950 shadow-sm";
    const inactiveClass = "text-zinc-500 hover:text-zinc-900";
    
    document.getElementById('mode-lumpsum').className = `rounded-md py-1.5 text-sm font-medium transition-all ${mode === 'lumpsum' ? activeClass : inactiveClass}`;
    document.getElementById('mode-sip').className = `rounded-md py-1.5 text-sm font-medium transition-all ${mode === 'sip' ? activeClass : inactiveClass}`;
    
    document.getElementById('amount-label').innerText = mode === 'lumpsum' ? "Total Investment (₹)" : "Monthly SIP Amount (₹)";
    updateAnalysis();
}

// Period selection
function setPeriod(y) {
    selectedPeriod = y;
    if (y === 'Custom') {
        showCustomDatePicker();
    } else {
        customStartDate = null;
        customEndDate = null;
        hideCustomDatePicker();
        updatePeriodLabels(selectedPeriod);
        initUI();
        updateAnalysis();
    }
}

// Update analysis
function updateAnalysis() {
    const inputAmount = parseFloat(document.getElementById('global-amount').value) || (investmentMode === 'sip' ? 5000 : 100000);
    const res = [];
    baskets.filter(b => b.active).forEach(b => {
        const d = calculateBasketPerformance(b, selectedPeriod, investmentMode, inputAmount, customStartDate, customEndDate);
        if (d) res.push({ basket: b, data: d });
    });
    currentAnalysisResults = res;
    renderCharts(res);
    renderStatsTable(res);
    updateURLWithSettings();
}

// Initialize UI
function initUI() {
    const periodButtons = PERIODS.map(y => `<button onclick="setPeriod('${y}')" id="btn-p-${y}" class="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 h-7 px-2.5 ${y === selectedPeriod ? 'ring-2 ring-zinc-950 border-transparent' : ''}">${y}</button>`).join('');
    
    const customDatePicker = `
        <div id="custom-date-picker" class="hidden mt-3 p-3 border border-zinc-200 rounded-md bg-zinc-50 space-y-2">
            <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                    <label class="text-xs font-medium text-zinc-700">Start Date</label>
                    <input type="date" id="custom-start-date" class="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950">
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-medium text-zinc-700">End Date</label>
                    <input type="date" id="custom-end-date" class="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950">
                </div>
            </div>
            <button onclick="applyCustomDates()" class="w-full inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-zinc-900 text-white hover:bg-zinc-800 h-7 px-3">Apply Custom Range</button>
        </div>
    `;
    
    document.getElementById('period-selector').innerHTML = `<div class="flex flex-wrap gap-1.5">${periodButtons}</div>${customDatePicker}`;
    renderBasketList();
}

// Basket management
function renderBasketList() {
    document.getElementById('basket-list').innerHTML = baskets.map(b => {
        const funds = Object.entries(b.allocation).filter(([, v]) => v > 0);
        const fundsList = funds.map(([k, v]) => {
            const fundName = FUNDS.find(f => f.id === k)?.name || k;
            return `<div class="text-zinc-600 leading-tight py-0.5">
                        ${fundName} <span class="font-medium text-zinc-800">(${v.toFixed(0)}%)</span>
                    </div>`;
        }).join('');
        
        return `
        <div class="group flex items-center justify-between p-2.5 rounded-md border border-zinc-100 bg-white hover:border-zinc-300 transition-all ${b.active ? 'shadow-sm' : 'opacity-60 grayscale'}">
            <div class="flex items-center gap-2.5 overflow-hidden flex-1">
                <div class="min-w-0 flex-1">
                    <div class="font-medium text-sm text-zinc-900 flex items-center gap-1.5 mb-1.5">
                        <input type="checkbox" ${b.active ? 'checked' : ''} onchange="toggleBasket(${b.id})" class="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer flex-shrink-0">
                        <span class="h-2 w-2 rounded-full flex-shrink-0" style="background-color:${b.color}"></span> ${b.name}
                    </div>
                    <div class="text-[11px] text-zinc-600 space-y-0.5 ml-6">
                        <div class="font-medium text-zinc-700 mb-1">${funds.length} ${funds.length === 1 ? 'fund' : 'funds'}</div>
                        ${fundsList}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                <button onclick="editBasket(${b.id})" class="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 h-6 px-1.5" title="Edit Basket"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                <button onclick="duplicateBasket(${b.id})" class="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors hover:bg-blue-100 hover:text-blue-600 h-6 px-1.5" title="Duplicate Basket"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                <button onclick="deleteBasket(${b.id})" class="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors hover:bg-red-100 hover:text-red-600 h-6 px-1.5" title="Delete Basket"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
        </div>`;
    }).join('');
}

function toggleBasket(id) {
    const b = baskets.find(x => x.id === id);
    if (b) {
        b.active = !b.active;
        renderBasketList();
        updateAnalysis();
    }
}

function editBasket(id) {
    openModal(id);
}

function duplicateBasket(id) {
    const originalBasket = baskets.find(b => b.id === id);
    if (!originalBasket) return;
    
    // Generate new unique ID
    const newId = Math.max(...baskets.map(b => b.id)) + 1;
    
    // Deep clone the basket with all properties including locks
    const duplicatedBasket = {
        id: newId,
        name: `${originalBasket.name} (Copy)`,
        active: originalBasket.active,
        color: originalBasket.color,
        allocation: JSON.parse(JSON.stringify(originalBasket.allocation)),
        locks: JSON.parse(JSON.stringify(originalBasket.locks))
    };
    
    baskets.push(duplicatedBasket);
    window.baskets = baskets;
    renderBasketList();
    updateAnalysis();
    showToast(`Basket duplicated: ${duplicatedBasket.name}`);
}

function deleteBasket(id) {
    if (baskets.length <= 1) {
        showToast('Cannot delete the last basket. At least one basket is required.', false);
        return;
    }
    if (confirm('Are you sure you want to delete this basket?')) {
        baskets = baskets.filter(b => b.id !== id);
        window.baskets = baskets;
        renderBasketList();
        updateAnalysis();
        showToast('Basket deleted successfully');
    }
}

function resetBaskets() {
    baskets = JSON.parse(JSON.stringify(DEFAULT_BASKETS));
    window.baskets = baskets;
    renderBasketList();
    updateAnalysis();
}

// Sorting
function toggleSort(key) {
    currentSort.direction = (currentSort.key === key && currentSort.direction === 'asc') ? 'desc' : 'asc';
    currentSort.key = key;
    renderStatsTable(currentAnalysisResults);
}

// URL sharing
function shareSettings() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Share link copied to clipboard!');
    }).catch(() => {
        prompt('Copy this URL to share:', window.location.href);
    });
}

function copyShareURL() {
    const input = document.getElementById('share-url-input');
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            showToast('Share link copied to clipboard!');
            btn.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            btn.classList.remove('bg-zinc-900', 'hover:bg-zinc-900/90');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                btn.classList.add('bg-zinc-900', 'hover:bg-zinc-900/90');
            }, 2000);
        }).catch(err => {
            console.error('Clipboard API failed:', err);
            fallbackCopy();
        });
    } else {
        fallbackCopy();
    }
    
    function fallbackCopy() {
        try {
            input.select();
            input.setSelectionRange(0, 99999);
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('Share link copied to clipboard!');
            } else {
                showToast('Please manually copy the URL (Ctrl+C or Cmd+C)', false);
                input.select();
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showToast('Please manually copy the URL (Ctrl+C or Cmd+C)', false);
            input.select();
        }
    }
}

// Initialize app
async function initApp() {
    const loadedFromURL = loadSettingsFromURL();
    initUI();
    updatePeriodLabels(selectedPeriod);
    await fetchAllData(baskets);
    updateAnalysis();
    
    setTimeout(() => {
        isInitializing = false;
        if (!loadedFromURL) {
            updateURLWithSettings();
        } else {
            updateShareURLInput();
        }
    }, 100);
    
    if (loadedFromURL) {
        updateStatus('ready', 'Loaded Shared Config');
        setTimeout(() => {
            updateStatus('ready', 'System Ready');
        }, 3000);
    }
}

// Custom date picker functions
function showCustomDatePicker() {
    const picker = document.getElementById('custom-date-picker');
    if (picker) {
        picker.classList.remove('hidden');
        
        // Set default dates if not already set
        const endInput = document.getElementById('custom-end-date');
        const startInput = document.getElementById('custom-start-date');
        
        if (!customEndDate) {
            const today = new Date();
            endInput.value = today.toISOString().split('T')[0];
        } else {
            endInput.value = customEndDate.toISOString().split('T')[0];
        }
        
        if (!customStartDate) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            startInput.value = oneYearAgo.toISOString().split('T')[0];
        } else {
            startInput.value = customStartDate.toISOString().split('T')[0];
        }
    }
}

function hideCustomDatePicker() {
    const picker = document.getElementById('custom-date-picker');
    if (picker) {
        picker.classList.add('hidden');
    }
}

function applyCustomDates() {
    const startInput = document.getElementById('custom-start-date');
    const endInput = document.getElementById('custom-end-date');
    
    if (!startInput.value || !endInput.value) {
        showToast('Please select both start and end dates', false);
        return;
    }
    
    const start = new Date(startInput.value);
    const end = new Date(endInput.value);
    
    if (start >= end) {
        showToast('Start date must be before end date', false);
        return;
    }
    
    customStartDate = start;
    customEndDate = end;
    
    updatePeriodLabels('Custom');
    updateAnalysis();
    showToast('Custom date range applied');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
