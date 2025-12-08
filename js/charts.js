// Chart Rendering

let perfChart, ddChart;

function renderCharts(results) {
    const ctxP = document.getElementById('performanceChart').getContext('2d');
    const ctxD = document.getElementById('drawdownChart').getContext('2d');
    const grad = (ctx, c) => {
        const g = ctx.createLinearGradient(0, 0, 0, 400);
        g.addColorStop(0, c + '33');
        g.addColorStop(1, c + '00');
        return g;
    };
    const opts = (isDD) => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        elements: { point: { radius: 0, hoverRadius: 6, hitRadius: 20 }, line: { tension: 0.2, borderWidth: 2 } },
        plugins: {
            legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Inter', size: 12 } } },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#09090b',
                bodyColor: '#52525b',
                borderColor: '#e4e4e7',
                borderWidth: 1,
                titleFont: { family: 'Inter', weight: '600' },
                bodyFont: { family: 'Inter' },
                padding: 12,
                callbacks: {
                    title: i => new Date(i[0].parsed.x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    label: c => isDD ? `${c.dataset.label}: ${c.parsed.y.toFixed(2)}%` : `${c.dataset.label}: ₹${Math.round(c.parsed.y).toLocaleString('en-IN')}`
                }
            }
        },
        scales: {
            x: { type: 'time', time: { unit: 'month' }, grid: { display: false }, ticks: { font: { family: 'Inter' }, color: '#71717a' } },
            y: { grid: { color: '#f4f4f5', borderDash: [4, 4] }, border: { display: false }, ticks: { font: { family: 'Inter' }, color: '#71717a', callback: v => isDD ? v + '%' : (v >= 100000 ? '₹' + (v / 100000).toFixed(1) + 'L' : v) } }
        }
    });

    if (perfChart) perfChart.destroy();
    if (ddChart) ddChart.destroy();
    
    perfChart = new Chart(ctxP, {
        type: 'line',
        data: { datasets: results.map(r => ({ label: r.basket.name, data: r.data.series.map(d => ({ x: d.x, y: d.y })), borderColor: r.basket.color, backgroundColor: grad(ctxP, r.basket.color), fill: true })) },
        options: opts(false)
    });
    ddChart = new Chart(ctxD, {
        type: 'line',
        data: { datasets: results.map(r => ({ label: r.basket.name, data: r.data.series.map(d => ({ x: d.x, y: d.drawdown })), borderColor: r.basket.color, backgroundColor: 'transparent', borderWidth: 1.5 })) },
        options: opts(true)
    });
}

function renderStatsTable(results) {
    const sorted = [...results].sort((a, b) => {
        if (!currentSort.key) return 0;
        const vA = currentSort.key === 'name' ? a.basket.name.toLowerCase() : a.data.stats[currentSort.key];
        const vB = currentSort.key === 'name' ? b.basket.name.toLowerCase() : b.data.stats[currentSort.key];
        return (vA < vB ? -1 : 1) * (currentSort.direction === 'asc' ? 1 : -1);
    });
    document.getElementById('stats-table-body').innerHTML = sorted.map(r => {
        const s = r.data.stats;
        return `<tr class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
            <td class="p-4 align-middle font-medium text-zinc-900 flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background-color:${r.basket.color}"></span>${r.basket.name}</td>
            <td class="p-4 align-middle text-right text-zinc-600 font-mono">₹${Math.round(s.initial).toLocaleString('en-IN')}</td>
            <td class="p-4 align-middle text-right font-bold text-zinc-900 font-mono">₹${Math.round(s.final).toLocaleString('en-IN')}</td>
            <td class="p-4 align-middle text-right text-emerald-600 font-semibold bg-emerald-50/50">${s.abs.toFixed(2)}%</td>
            <td class="p-4 align-middle text-right text-blue-600 font-medium">${investmentMode === 'sip' ? s.cagr.toFixed(2) : s.cagr.toFixed(2)}%</td>
            <td class="p-4 align-middle text-right text-red-600 font-medium bg-red-50/50">${s.mdd.toFixed(2)}%</td>
        </tr>`;
    }).join('');
}
