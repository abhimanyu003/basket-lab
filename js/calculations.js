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

function calculateDaysBetween(startDate, endDate) {
    return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
}

function calculateDrawdown(currentValue, peakValue) {
    return peakValue > 0 ? parseFloat((((currentValue - peakValue) / peakValue) * 100).toFixed(2)) : 0;
}

function updateDrawdownTracking(drawdown, date, drawdownState) {
    const { drawdownPeriods, currentDrawdownStart, isInDrawdown } = drawdownState;
    
    if (drawdown < 0 && !isInDrawdown) {
        // Starting a new drawdown period
        drawdownState.isInDrawdown = true;
        drawdownState.currentDrawdownStart = date;
    } else if (drawdown === 0 && isInDrawdown) {
        // Recovered from drawdown
        if (currentDrawdownStart) {
            const drawdownDays = calculateDaysBetween(currentDrawdownStart, date);
            if (drawdownDays > 0) {
                drawdownPeriods.push(drawdownDays);
            }
        }
        drawdownState.isInDrawdown = false;
        drawdownState.currentDrawdownStart = null;
    }
}

function finalizeDrawdownTracking(lastDate, drawdownState) {
    const { drawdownPeriods, currentDrawdownStart, isInDrawdown } = drawdownState;
    
    if (isInDrawdown && currentDrawdownStart) {
        const drawdownDays = calculateDaysBetween(currentDrawdownStart, lastDate);
        if (drawdownDays > 0) {
            drawdownPeriods.push(drawdownDays);
        }
    }
    
    const avgDrawdownDuration = drawdownPeriods.length > 0 ? 
        Math.round(drawdownPeriods.reduce((sum, days) => sum + days, 0) / drawdownPeriods.length) : 0;
    const maxDrawdownDuration = drawdownPeriods.length > 0 ? Math.max(...drawdownPeriods) : 0;
    
    return { avgDrawdownDuration, maxDrawdownDuration };
}

function findNAVForDate(history, targetDate) {
    let navEntry = history.find(d => d.date.getTime() === targetDate.getTime());
    if (!navEntry) {
        const past = history.filter(d => d.date < targetDate);
        if (past.length > 0) navEntry = past[past.length - 1];
    }
    return navEntry;
}

function calculateDailyValue(holdings, date) {
    let dailyValue = 0;
    let dataMissing = false;
    
    for (const data of Object.values(holdings)) {
        const navEntry = findNAVForDate(data.history, date);
        if (navEntry) {
            dailyValue += data.units * navEntry.nav;
        } else {
            dataMissing = true;
        }
    }
    
    return { dailyValue, dataMissing };
}

function initializeLumpsumHoldings(basket, inputAmount, targetStartDate) {
    const holdings = {};
    
    for (const [fundId, weight] of Object.entries(basket.allocation)) {
        if (weight === 0) continue;
        if (!NAV_CACHE[fundId]) return null;
        
        const purchaseNavObj = findClosestNAVBeforeOrOn(NAV_CACHE[fundId], targetStartDate);
        if (!purchaseNavObj) return null;
        
        holdings[fundId] = { 
            units: (inputAmount * weight / 100) / purchaseNavObj.nav, 
            history: NAV_CACHE[fundId] 
        };
    }
    
    return holdings;
}

function initializeSIPHoldings(basket) {
    const holdings = {};
    
    for (const [fundId, weight] of Object.entries(basket.allocation)) {
        if (weight === 0) continue;
        if (!NAV_CACHE[fundId]) return null;
        
        holdings[fundId] = { 
            units: 0, 
            history: NAV_CACHE[fundId], 
            weight: weight 
        };
    }
    
    return holdings;
}

function processSIPInvestment(holdings, inputAmount, date) {
    for (const data of Object.values(holdings)) {
        const navEntry = findNAVForDate(data.history, date);
        if (navEntry) {
            data.units += (inputAmount * data.weight / 100) / navEntry.nav;
        }
    }
}

function calculateLumpsumPerformance(basket, inputAmount, activeTimeline, targetStartDate) {
    const holdings = initializeLumpsumHoldings(basket, inputAmount, targetStartDate);
    if (!holdings) return null;

    const timeSeries = [];
    let maxDrawdown = 0;
    let peakValue = 0;
    const drawdownState = {
        drawdownPeriods: [],
        currentDrawdownStart: null,
        isInDrawdown: false
    };

    for (const dayPoint of activeTimeline) {
        const date = dayPoint.date;
        const { dailyValue, dataMissing } = calculateDailyValue(holdings, date);
        
        if (!dataMissing) {
            // Update peak value and handle drawdown periods
            if (dailyValue > peakValue) {
                if (drawdownState.isInDrawdown && drawdownState.currentDrawdownStart) {
                    const drawdownDays = calculateDaysBetween(drawdownState.currentDrawdownStart, date);
                    if (drawdownDays > 0) {
                        drawdownState.drawdownPeriods.push(drawdownDays);
                    }
                    drawdownState.isInDrawdown = false;
                    drawdownState.currentDrawdownStart = null;
                }
                peakValue = dailyValue;
            }
            
            const drawdown = calculateDrawdown(dailyValue, peakValue);
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;
            
            updateDrawdownTracking(drawdown, date, drawdownState);
            timeSeries.push({ x: date, y: dailyValue, drawdown: drawdown });
        }
    }

    if (timeSeries.length === 0) return null;

    const finalValue = timeSeries[timeSeries.length - 1].y;
    const absReturn = ((finalValue - inputAmount) / inputAmount) * 100;
    
    // Calculate CAGR
    const actualEndDate = timeSeries[timeSeries.length - 1].x;
    const actualDurationDays = calculateDaysBetween(targetStartDate, actualEndDate);
    const actualDurationYears = actualDurationDays / 365.25;
    const cagr = actualDurationYears > 0 ? (Math.pow((finalValue / inputAmount), (1 / actualDurationYears)) - 1) * 100 : 0;
    
    const { avgDrawdownDuration, maxDrawdownDuration } = finalizeDrawdownTracking(
        timeSeries[timeSeries.length - 1].x, 
        drawdownState
    );
    
    return { 
        series: timeSeries, 
        stats: { 
            initial: inputAmount, 
            final: finalValue, 
            abs: absReturn, 
            cagr: cagr, 
            mdd: maxDrawdown,
            avgDdDuration: avgDrawdownDuration,
            maxDdDuration: maxDrawdownDuration
        } 
    };
}

function calculateSIPPerformance(basket, inputAmount, activeTimeline, actualStartDate) {
    const holdings = initializeSIPHoldings(basket);
    if (!holdings) return null;

    const timeSeries = [];
    let totalInvested = 0;
    let maxDrawdown = 0;
    let peakValue = 0;
    const drawdownState = {
        drawdownPeriods: [],
        currentDrawdownStart: null,
        isInDrawdown: false
    };

    let nextSipDate = new Date(actualStartDate);
    let sipCount = 0;
    const sipCashflows = [];

    for (const dayPoint of activeTimeline) {
        const date = dayPoint.date;
        
        // Process SIP investment if due
        if (date >= nextSipDate) {
            processSIPInvestment(holdings, inputAmount, date);
            sipCashflows.push({ amount: -inputAmount, date: new Date(date) });
            totalInvested += inputAmount;
            sipCount++;
            nextSipDate = new Date(actualStartDate);
            nextSipDate.setMonth(nextSipDate.getMonth() + sipCount);
        }

        const { dailyValue, dataMissing } = calculateDailyValue(holdings, date);

        if (!dataMissing && totalInvested > 0) {
            // Update peak value and handle drawdown periods
            if (dailyValue > peakValue) {
                if (drawdownState.isInDrawdown && drawdownState.currentDrawdownStart) {
                    const drawdownDays = calculateDaysBetween(drawdownState.currentDrawdownStart, date);
                    if (drawdownDays > 0) {
                        drawdownState.drawdownPeriods.push(drawdownDays);
                    }
                    drawdownState.isInDrawdown = false;
                    drawdownState.currentDrawdownStart = null;
                }
                peakValue = dailyValue;
            }
            
            const drawdown = calculateDrawdown(dailyValue, peakValue);
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;
            
            updateDrawdownTracking(drawdown, date, drawdownState);
            timeSeries.push({ x: date, y: dailyValue, drawdown: drawdown });
        }
    }

    if (timeSeries.length === 0) return null;
    
    const finalValue = timeSeries[timeSeries.length - 1].y;
    const absReturn = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;
    const lastDate = timeSeries[timeSeries.length - 1].x;
    sipCashflows.push({ amount: finalValue, date: new Date(lastDate) });
    
    const xirr = calculateXIRR(sipCashflows);
    const { avgDrawdownDuration, maxDrawdownDuration } = finalizeDrawdownTracking(lastDate, drawdownState);
    
    return { 
        series: timeSeries, 
        stats: { 
            initial: totalInvested, 
            final: finalValue, 
            abs: absReturn, 
            cagr: xirr, 
            mdd: maxDrawdown,
            avgDdDuration: avgDrawdownDuration,
            maxDdDuration: maxDrawdownDuration
        } 
    };
}

// Main function - Calculate Basket Performance
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

    if (investmentMode === 'lumpsum') {
        return calculateLumpsumPerformance(basket, inputAmount, activeTimeline, targetStartDate);
    } else {
        return calculateSIPPerformance(basket, inputAmount, activeTimeline, actualStartDate);
    }
}
