function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function calculateYearlyReturns(basket, periodStr, investmentMode, inputAmount, customStart = null, customEnd = null) {
    const targetStartDate = getTargetStartDate(periodStr, customStart);
    const targetEndDate = getTargetEndDate(periodStr, customEnd);
    const masterFundId = '118741'; 
    
    if (!NAV_CACHE[masterFundId]) return null;

    const masterHistory = NAV_CACHE[masterFundId];
    const startNode = findClosestNAVBeforeOrOn(masterHistory, targetStartDate);
    if (!startNode) return null;
    
    const actualStartDate = startNode.date;
    const activeTimeline = masterHistory.filter(d => d.date >= actualStartDate && d.date <= targetEndDate);
    
    if (activeTimeline.length === 0) return null;

    
    const yearlyData = {};
    
    
    if (investmentMode === 'lumpsum') {
        const holdings = {};
        let isValid = true;
        
        
        let earliestCommonDate = actualStartDate;
        
        for (const [fundId, weight] of Object.entries(basket.allocation)) {
            if (weight === 0) continue;
            if (!NAV_CACHE[fundId]) { isValid = false; break; }
            
            const fundHistory = NAV_CACHE[fundId];
            if (fundHistory.length === 0) { isValid = false; break; }
            
            
            const fundEarliestDate = fundHistory[0].date;
            
            
            if (fundEarliestDate > earliestCommonDate) {
                earliestCommonDate = fundEarliestDate;
            }
            
            const purchaseNavObj = findClosestNAVBeforeOrOn(fundHistory, earliestCommonDate);
            if (!purchaseNavObj) { isValid = false; break; }
            holdings[fundId] = { 
                units: (inputAmount * weight / 100) / purchaseNavObj.nav, 
                history: fundHistory 
            };
        }
        
        if (!isValid) return null;

        
        activeTimeline.forEach(dayPoint => {
            const date = dayPoint.date;
            const year = date.getFullYear();
            
            
            if (date < earliestCommonDate) {
                return;
            }
            
            let dailyValue = 0;
            let dataMissing = false;
            
            for (const [fundId, data] of Object.entries(holdings)) {
                let navEntry = data.history.find(d => d.date.getTime() === date.getTime());
                if (!navEntry) {
                    const past = data.history.filter(d => d.date < date);
                    if (past.length > 0) navEntry = past[past.length - 1];
                }
                if (navEntry) {
                    dailyValue += data.units * navEntry.nav;
                } else {
                    dataMissing = true;
                }
            }
            
            if (!dataMissing) {
                if (!yearlyData[year]) {
                    yearlyData[year] = { startValue: dailyValue, endValue: dailyValue, startDate: date, endDate: date };
                } else {
                    yearlyData[year].endValue = dailyValue;
                    yearlyData[year].endDate = date;
                }
            }
        });
        
    } else {
        
        const holdings = {};
        let isValid = true;
        
        
        let earliestCommonDate = actualStartDate;
        
        for (const [fundId, weight] of Object.entries(basket.allocation)) {
            if (weight === 0) continue;
            if (!NAV_CACHE[fundId]) { isValid = false; break; }
            
            const fundHistory = NAV_CACHE[fundId];
            if (fundHistory.length === 0) { isValid = false; break; }
            
            
            const fundEarliestDate = fundHistory[0].date;
            
            
            if (fundEarliestDate > earliestCommonDate) {
                earliestCommonDate = fundEarliestDate;
            }
            
            holdings[fundId] = { units: 0, history: fundHistory, weight: weight };
        }
        
        if (!isValid) return null;

        let nextSipDate = new Date(actualStartDate);
        let sipCount = 0;
        let totalInvestedSoFar = 0;

        activeTimeline.forEach(dayPoint => {
            const date = dayPoint.date;
            const year = date.getFullYear();
            
            
            if (date < earliestCommonDate) {
                return;
            }
            
            
            if (date >= nextSipDate) {
                for (const [fundId, data] of Object.entries(holdings)) {
                    let navEntry = data.history.find(d => d.date.getTime() === date.getTime());
                    if (!navEntry) {
                        const past = data.history.filter(d => d.date < date);
                        if (past.length > 0) navEntry = past[past.length - 1];
                    }
                    if (navEntry) {
                        data.units += (inputAmount * data.weight / 100) / navEntry.nav;
                    }
                }
                
                totalInvestedSoFar += inputAmount;
                sipCount++;
                nextSipDate = new Date(actualStartDate);
                nextSipDate.setMonth(nextSipDate.getMonth() + sipCount);
            }

            
            let dailyValue = 0;
            let dataMissing = false;
            
            for (const [fundId, data] of Object.entries(holdings)) {
                let navEntry = data.history.find(d => d.date.getTime() === date.getTime());
                if (!navEntry) {
                    const past = data.history.filter(d => d.date < date);
                    if (past.length > 0) navEntry = past[past.length - 1];
                }
                if (navEntry) {
                    dailyValue += data.units * navEntry.nav;
                } else if (data.units > 0) {
                    dataMissing = true;
                }
            }

            if (!dataMissing && totalInvestedSoFar > 0) {
                if (!yearlyData[year]) {
                    yearlyData[year] = { 
                        startValue: dailyValue, 
                        endValue: dailyValue, 
                        startDate: date, 
                        endDate: date,
                        startInvested: totalInvestedSoFar,
                        endInvested: totalInvestedSoFar
                    };
                } else {
                    yearlyData[year].endValue = dailyValue;
                    yearlyData[year].endDate = date;
                    yearlyData[year].endInvested = totalInvestedSoFar;
                }
            }
        });
    }

    
    const yearlyReturns = {};
    for (const [year, data] of Object.entries(yearlyData)) {
        if (investmentMode === 'lumpsum') {
            
            const yearReturn = ((data.endValue - data.startValue) / data.startValue) * 100;
            yearlyReturns[year] = {
                return: yearReturn,
                startValue: data.startValue,
                endValue: data.endValue
            };
        } else {
            
            
            const totalInvested = data.endInvested;
            const currentValue = data.endValue;
            
            
            let yearReturn = 0;
            if (totalInvested > 0) {
                yearReturn = ((currentValue - totalInvested) / totalInvested) * 100;
            }
            
            yearlyReturns[year] = {
                return: yearReturn,
                startValue: data.startValue,
                endValue: data.endValue,
                invested: totalInvested
            };
        }
    }

    return yearlyReturns;
}

/**
 * Calculate rankings for all active baskets across all years
 */
function calculateAllYearlyRankings(results) {
    const allYearlyData = {};
    
    
    results.forEach(result => {
        const basket = result.basket;
        const inputAmount = parseFloat(document.getElementById('global-amount').value) || (investmentMode === 'sip' ? 5000 : 100000);
        const yearlyReturns = calculateYearlyReturns(basket, selectedPeriod, investmentMode, inputAmount, customStartDate, customEndDate);
        
        if (yearlyReturns) {
            for (const [year, data] of Object.entries(yearlyReturns)) {
                if (!allYearlyData[year]) {
                    allYearlyData[year] = [];
                }
                allYearlyData[year].push({
                    basketId: basket.id,
                    basketName: basket.name,
                    basketColor: basket.color,
                    return: data.return,
                    startValue: data.startValue,
                    endValue: data.endValue
                });
            }
        }
    });

    
    const rankings = {};
    for (const [year, baskets] of Object.entries(allYearlyData)) {
        rankings[year] = baskets.sort((a, b) => b.return - a.return);
    }

    return rankings;
}

function renderYearlyRankingTable(results) {
    const container = document.getElementById('yearly-ranking-container');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = '<p class="text-sm text-zinc-500 p-6">No data available for ranking.</p>';
        return;
    }

    const rankings = calculateAllYearlyRankings(results);
    const years = Object.keys(rankings).sort((a, b) => parseInt(a) - parseInt(b));

    if (years.length === 0) {
        container.innerHTML = '<p class="text-sm text-zinc-500 p-6">No yearly data available for the selected period.</p>';
        return;
    }

    
    let tableHTML = `
        <div class="w-full overflow-auto">
            <table class="w-full text-sm caption-bottom">
                <thead class="[&_tr]:border-b">
                    <tr class="border-b border-zinc-200">
                        <th class="h-10 px-4 text-center align-middle font-medium text-zinc-500 sticky left-0 z-20 bg-white border-r border-zinc-200" style="width: 80px; min-width: 80px; max-width: 80px;">Rank</th>
    `;

    
    years.forEach(year => {
        tableHTML += `<th class="h-10 px-4 text-center align-middle font-medium text-zinc-500 border-r border-zinc-200 min-w-[180px]">${year}</th>`;
    });

    tableHTML += `
                    </tr>
                </thead>
                <tbody>
    `;

    
    const maxBaskets = Math.max(...Object.values(rankings).map(r => r.length));

    
    for (let rank = 1; rank <= maxBaskets; rank++) {
        tableHTML += `<tr class="border-b border-zinc-100 last:border-0 transition-colors">`;
    
        
        tableHTML += `
            <td class="p-3 align-middle text-center font-bold sticky left-0 z-10 bg-white border-r border-zinc-200 text-zinc-500">
                <span class="text-sm font-medium">${rank}</span>
            </td>
        `;

        
        years.forEach(year => {
            const yearRankings = rankings[year];
            const basketAtRank = yearRankings[rank - 1];

            if (basketAtRank) {
                const returnColor = basketAtRank.return >= 0 ? 'text-emerald-600' : 'text-red-600';
                const rgbaColor = hexToRgba(basketAtRank.basketColor, 0.09);
                
                tableHTML += `
                    <td class="p-3 align-middle border border-zinc-200" style="background-color: ${rgbaColor};">
                        <div class="flex flex-col gap-1.5">
                            <div class="flex items-center gap-3">
                                <span class="h-1.5 w-1.5 rounded-full flex-shrink-0" style="background-color:${basketAtRank.basketColor}"></span>
                                <span class="text-zinc-900 text-xs font-medium">${basketAtRank.basketName}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="h-1.5 w-1.5 rounded-full flex-shrink-0"></span>
                                <div class="font-normal ${returnColor}">${basketAtRank.return.toFixed(2)}%</div>
                            </div>
                        </div>
                    </td>
                `;
            } else {
                tableHTML += `<td class="p-3 align-middle border-r border-zinc-100 text-center text-zinc-400">—</td>`;
            }
        });

        tableHTML += `</tr>`;
    }

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;
}
