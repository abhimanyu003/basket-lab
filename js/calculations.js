// Financial Calculations

// XIRR Calculation using Newton-Raphson method
function calculateXIRR(transactions) {
    if (transactions.length < 2) return 0;
    
    const firstDate = transactions[0].date;
    let rate = 0.1; // Initial guess: 10%
    const maxIter = 100; // Increased iterations for better convergence
    const tol = 1e-9; // Tighter tolerance for accuracy
    
    for (let i = 0; i < maxIter; i++) {
        let fValue = 0;
        let fDerivative = 0;
        
        for (const t of transactions) {
            // Calculate time difference in years (using 365.25 for leap years)
            const dt = (t.date - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
            const factor = Math.pow(1 + rate, dt);
            
            // NPV calculation
            fValue += t.amount / factor;
            
            // Derivative for Newton-Raphson
            fDerivative -= (dt * t.amount) / (factor * (1 + rate));
        }
        
        // Check for convergence or derivative too small
        if (Math.abs(fDerivative) < 1e-10) break;
        
        const newRate = rate - fValue / fDerivative;
        
        // Check if converged
        if (Math.abs(newRate - rate) < tol) return newRate * 100;
        
        rate = newRate;
        
        // Prevent unrealistic rates
        if (rate < -0.99) rate = -0.99; // Minimum -99%
        if (rate > 10) rate = 10; // Maximum 1000%
    }
    
    return rate * 100;
}

// Convert Period String to Date
function getTargetStartDate(periodStr, customStart = null) {
    if (periodStr === 'Custom' && customStart) {
        const date = new Date(customStart);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const past = new Date(today);
    
    const value = parseInt(periodStr);
    if (periodStr.endsWith('M')) {
        past.setMonth(past.getMonth() - value);
    } else {
        past.setFullYear(past.getFullYear() - value);
    }
    return past;
}

// Get End Date
function getTargetEndDate(periodStr, customEnd = null) {
    if (periodStr === 'Custom' && customEnd) {
        const date = new Date(customEnd);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// Get Duration in Years
function getDurationInYears(periodStr, customStart = null, customEnd = null) {
    if (periodStr === 'Custom' && customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        const diffTime = Math.abs(end - start);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays / 365.0;
    }
    
    const value = parseInt(periodStr);
    if (periodStr.endsWith('M')) return value / 12.0;
    return value;
}

// Find Closest NAV
function findClosestNAVBeforeOrOn(history, targetDate) {
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].date <= targetDate) return history[i];
    }
    return history[0];
}

// Calculate Basket Performance
function calculateBasketPerformance(basket, periodStr, investmentMode, inputAmount, customStart = null, customEnd = null) {
    const targetStartDate = getTargetStartDate(periodStr, customStart);
    const targetEndDate = getTargetEndDate(periodStr, customEnd);
    const masterFundId = '118741'; // Nifty 50
    if (!NAV_CACHE[masterFundId]) return null;

    const masterHistory = NAV_CACHE[masterFundId];
    const startNode = findClosestNAVBeforeOrOn(masterHistory, targetStartDate);
    if (!startNode) return null;
    const actualStartDate = startNode.date;
    const activeTimeline = masterHistory.filter(d => d.date >= actualStartDate && d.date <= targetEndDate);

    let timeSeries = [];
    let maxDrawdown = 0;
    let peakValue = 0;
    
    // LUMPSUM
    if (investmentMode === 'lumpsum') {
        const holdings = {};
        let isValid = true;
        for (const [fundId, weight] of Object.entries(basket.allocation)) {
            if (weight === 0) continue;
            if (!NAV_CACHE[fundId]) { isValid = false; break; }
            const purchaseNavObj = findClosestNAVBeforeOrOn(NAV_CACHE[fundId], targetStartDate);
            if (!purchaseNavObj) { isValid = false; break; }
            holdings[fundId] = { units: (inputAmount * weight / 100) / purchaseNavObj.nav, history: NAV_CACHE[fundId] };
        }
        if (!isValid) return null;

        activeTimeline.forEach(dayPoint => {
            const date = dayPoint.date;
            let dailyValue = 0;
            let dataMissing = false;
            for (const [fundId, data] of Object.entries(holdings)) {
                let navEntry = data.history.find(d => d.date.getTime() === date.getTime());
                if (!navEntry) {
                    const past = data.history.filter(d => d.date < date);
                    if (past.length > 0) navEntry = past[past.length - 1];
                }
                if (navEntry) dailyValue += data.units * navEntry.nav;
                else dataMissing = true;
            }
            if (!dataMissing) {
                if (dailyValue > peakValue) peakValue = dailyValue;
                const drawdown = peakValue > 0 ? parseFloat((((dailyValue - peakValue) / peakValue) * 100).toFixed(2)) : 0;
                if (drawdown < maxDrawdown) maxDrawdown = drawdown;
                timeSeries.push({ x: date, y: dailyValue, drawdown: drawdown });
            }
        });
        if (timeSeries.length === 0) return null;
        
        const finalValue = timeSeries[timeSeries.length - 1].y;
        const absReturn = ((finalValue - inputAmount) / inputAmount) * 100;
        
        // Calculate actual duration in years from actual start and end dates
        const actualEndDate = timeSeries[timeSeries.length - 1].x;
        const actualDurationDays = (actualEndDate - actualStartDate) / (1000 * 60 * 60 * 24);
        const actualDurationYears = actualDurationDays / 365.25; // Use 365.25 to account for leap years
        
        const cagr = actualDurationYears > 0 ? (Math.pow((finalValue / inputAmount), (1 / actualDurationYears)) - 1) * 100 : 0;
        
        return { series: timeSeries, stats: { initial: inputAmount, final: finalValue, abs: absReturn, cagr: cagr, mdd: maxDrawdown } };
    }
    // SIP
    else {
        const holdings = {};
        let totalInvested = 0;
        let isValid = true;
        for (const [fundId, weight] of Object.entries(basket.allocation)) {
            if (weight === 0) continue;
            if (!NAV_CACHE[fundId]) { isValid = false; break; }
            holdings[fundId] = { units: 0, history: NAV_CACHE[fundId], weight: weight };
        }
        if (!isValid) return null;

        let nextSipDate = new Date(actualStartDate);
        let sipCount = 0;
        const sipCashflows = [];

        activeTimeline.forEach(dayPoint => {
            const date = dayPoint.date;
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
                sipCashflows.push({ amount: -inputAmount, date: new Date(date) });
                totalInvested += inputAmount;
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
                if (navEntry) dailyValue += data.units * navEntry.nav;
                else if (data.units > 0) dataMissing = true;
            }

            if (!dataMissing && totalInvested > 0) {
                if (dailyValue > peakValue) peakValue = dailyValue;
                let drawdown = 0;
                if (peakValue > 0) drawdown = parseFloat((((dailyValue - peakValue) / peakValue) * 100).toFixed(2));
                if (drawdown < maxDrawdown) maxDrawdown = drawdown;
                timeSeries.push({ x: date, y: dailyValue, drawdown: drawdown });
            }
        });

        if (timeSeries.length === 0) return null;
        const finalValue = timeSeries[timeSeries.length - 1].y;
        const absReturn = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;
        const lastDate = timeSeries[timeSeries.length - 1].x;
        sipCashflows.push({ amount: finalValue, date: new Date(lastDate) });
        
        // XIRR accounts for the timing and amount of each cashflow
        const xirr = calculateXIRR(sipCashflows);
        
        return { series: timeSeries, stats: { initial: totalInvested, final: finalValue, abs: absReturn, cagr: xirr, mdd: maxDrawdown } };
    }
}
