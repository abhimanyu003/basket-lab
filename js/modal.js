// Modal Fund Management

function deleteFund(id) {
    modalFundsState = modalFundsState.filter(f => f.id !== id);
    renderModalInputs();
}

function toggleLock(id) {
    const f = modalFundsState.find(x => x.id === id);
    if (f) {
        f.locked = !f.locked;
        const inputEl = document.getElementById(`weight-input-${id}`);
        if (inputEl) {
            inputEl.disabled = f.locked;
            inputEl.classList.toggle('disabled:opacity-50', f.locked);
            inputEl.classList.toggle('disabled:bg-zinc-100', f.locked);
        }
        const lockBtn = event.target.closest('button');
        if (lockBtn) {
            const lockIcon = f.locked
                ? `<svg class="h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                : `<svg class="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;
            lockBtn.innerHTML = lockIcon;
            lockBtn.title = f.locked ? 'Unlock' : 'Lock';
        }
    }
}

function handleWeightChange(id, newValueStr) {
    let newValue = parseFloat(newValueStr);
    if (isNaN(newValue) || newValueStr === '') newValue = 0;
    
    const otherLockedWeight = modalFundsState.filter(f => f.id !== id && f.locked).reduce((sum, f) => sum + parseFloat(f.weight), 0);
    const maxAllowed = 100 - otherLockedWeight;
    newValue = Math.max(0, Math.min(maxAllowed, newValue));
    newValue = parseFloat(newValue.toFixed(2));

    const fundIndex = modalFundsState.findIndex(f => f.id === id);
    if (fundIndex === -1) return;

    modalFundsState[fundIndex].weight = newValue;
    const currentTotal = modalFundsState.reduce((sum, f) => sum + parseFloat(f.weight), 0);
    const overflow = currentTotal - 100;
    const unlockedOthers = modalFundsState.filter(f => f.id !== id && !f.locked);
    
    if (Math.abs(overflow) > 0.01 && unlockedOthers.length > 0) {
        const totalUnlockedWeight = unlockedOthers.reduce((sum, f) => sum + parseFloat(f.weight), 0);
        if (totalUnlockedWeight > 0) {
            unlockedOthers.forEach(f => {
                const proportion = f.weight / totalUnlockedWeight;
                f.weight = parseFloat(Math.max(0, f.weight - (overflow * proportion)).toFixed(2));
            });
        } else if (overflow < 0) {
            const share = Math.abs(overflow) / unlockedOthers.length;
            unlockedOthers.forEach(f => {
                f.weight = parseFloat((f.weight + share).toFixed(2));
            });
        }
    }
    
    refreshInputValues();
}

function refreshInputValues() {
    modalFundsState.forEach(f => {
        const inputEl = document.getElementById(`weight-input-${f.id}`);
        if (inputEl) {
            if (document.activeElement !== inputEl) {
                const displayVal = f.weight > 0 ? parseFloat(f.weight.toFixed(2)) : '';
                inputEl.value = displayVal;
            }
        }
    });
    updateModalTotal();
}

function renderModalInputs() {
    const sortedFunds = [...modalFundsState].sort((a, b) => (a.weight > 0 && b.weight === 0) ? -1 : (a.weight === 0 && b.weight > 0) ? 1 : a.name.localeCompare(b.name));
    const tbody = document.getElementById('modal-fund-rows');
    tbody.innerHTML = sortedFunds.map(f => {
        const bgClass = f.weight > 0 ? 'bg-zinc-50' : 'bg-white';
        const lockIcon = f.locked
            ? `<svg class="h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
            : `<svg class="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;
        
        const displayValue = f.weight > 0 ? parseFloat(f.weight.toFixed(2)) : '';

        return `<tr class="group border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors ${bgClass}">
            <td class="p-3 align-middle"><div class="text-sm font-medium text-zinc-700 truncate max-w-[400px]" title="${f.name}">${f.name}</div></td>
            <td class="p-3 align-middle text-right"><div class="flex items-center justify-end"><input type="number" id="weight-input-${f.id}" min="0" max="100" step="0.01" value="${displayValue}" placeholder="0.00" ${f.locked ? 'disabled' : ''} class="flex h-9 w-24 rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-right text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:opacity-50 disabled:bg-zinc-100" oninput="handleWeightChange('${f.id}', this.value)"></div></td>
            <td class="p-3 align-middle text-center"><button onclick="event.preventDefault(); toggleLock('${f.id}')" type="button" class="p-2 rounded-md hover:bg-zinc-200 transition-colors" title="${f.locked ? 'Unlock' : 'Lock'}">${lockIcon}</button></td>
            <td class="p-3 align-middle text-center"><button onclick="event.preventDefault(); deleteFund('${f.id}')" type="button" class="p-2 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"><svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></td>
        </tr>`;
    }).join('');
    updateModalTotal();
}

function updateModalTotal() {
    const t = modalFundsState.reduce((sum, f) => sum + parseFloat(f.weight), 0);
    const el = document.getElementById('modal-total-alloc');
    el.innerText = t.toFixed(2) + '%';
    el.className = Math.abs(t - 100) < 0.1 ? 'text-lg font-bold text-emerald-600' : 'text-lg font-bold text-red-600';
}

async function saveBasketFromModal() {
    const name = document.getElementById('modal-basket-name').value;
    const color = document.getElementById('modal-basket-color').value;
    const newAlloc = {};
    const newLocks = {};
    let total = 0;
    modalFundsState.forEach(f => {
        newAlloc[f.id] = f.weight;
        if (f.weight > 0) {
            total += f.weight;
        }
        if (f.locked) {
            newLocks[f.id] = true;
        }
    });
    if (Math.abs(total - 100) > 0.1) {
        alert("Total allocation must be 100%");
        return;
    }
    
    const allFundIds = Object.keys(newAlloc);
    const missing = allFundIds.filter(id => !NAV_CACHE[id]);
    if (missing.length) {
        const btn = document.querySelector('#modal-overlay button.bg-zinc-900');
        btn.innerText = "Downloading...";
        btn.disabled = true;
        await Promise.all(missing.map(id => fetchFundData(id)));
        btn.innerText = "Save Basket";
        btn.disabled = false;
    }

    if (editingBasketId) {
        const b = window.baskets.find(x => x.id === editingBasketId);
        b.name = name;
        b.allocation = newAlloc;
        b.color = color;
        b.locks = newLocks;
    } else {
        const maxId = window.baskets.length > 0 ? Math.max(...window.baskets.map(b => b.id)) : 0;
        window.baskets.push({ id: maxId + 1, name, active: true, color, allocation: newAlloc, locks: newLocks });
    }
    closeModal();
    window.renderBasketList();
    window.updateAnalysis();
}
