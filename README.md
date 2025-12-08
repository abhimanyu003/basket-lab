# 📊 Indian Mutual Fund Basket Analyzer - Backtesting & Portfolio Collection Tool

A interactive tool to backtest and analyze Indian mutual fund baskets and portfolio collections with real historical data. Build custom fund baskets, compare multiple portfolio collections, visualize performance, calculate returns (CAGR/XIRR), and assess risk through drawdown analysis.

## ✨ Features

- **Basket Backtesting** - Test historical performance of custom mutual fund baskets and collections
- **Multiple Portfolio Collections** - Compare different fund basket combinations side-by-side
- **Lumpsum & SIP Modes** - Backtest both one-time investments and monthly SIP strategies
- **Flexible Time Periods** - Backtest performance across 3M, 6M, 1Y, 3Y, 5Y, 10Y, or custom date ranges
- **Real-time Calculations** - CAGR, XIRR, absolute returns, and maximum drawdown metrics for each basket
- **Interactive Charts** - Growth trajectory and risk visualization for basket collections
- **Shareable Basket Configurations** - Generate URLs to share your basket and collection setups with others
- **Smart Fund Search** - Fuzzy search powered by Fuse.js for easy fund discovery and basket building

## 🚀 Quick Start

1. Clone the repository
2. Open `index.html` in your browser
3. Start analyzing mutual fund baskets!

No build process or dependencies required - it's a pure client-side application.

## 💡 How to Use

1. **Choose Investment Mode** - Select between Lumpsum or Monthly SIP for backtesting
2. **Set Amount & Period** - Configure your investment amount and backtesting time horizon
3. **Create Fund Baskets** - Build custom baskets by adding funds and setting allocation percentages
4. **Build Portfolio Collections** - Create multiple baskets to compare different strategies
5. **Backtest Performance** - View side-by-side backtesting metrics and charts for each basket
6. **Share Basket Collections** - Copy the URL to share your basket analysis with others

## 📈 Backtesting Metrics Explained

- **CAGR** - Compound Annual Growth Rate for lumpsum basket investments
- **XIRR** - Extended Internal Rate of Return for SIP basket investments
- **Max Drawdown** - Largest peak-to-trough decline in basket value (risk indicator)
- **Absolute Returns** - Total percentage gain/loss for each basket in your collection

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. Past performance does not guarantee future results. The data is sourced from public APIs and may contain inaccuracies. This is not financial advice. Please consult with a qualified financial advisor before making any investment decisions.

## 🛠️ Tech Stack

- Vanilla JavaScript (ES6+)
- Chart.js for visualizations
- Tailwind CSS for styling
- Fuse.js for fuzzy search
- [MFAPI](https://www.mfapi.in/) for providing mutual fund data — a big thank you for offering such a helpful API.

## 📄 License

Open source project - feel free to use and modify.

---

Made with ❤️ for Indian investors
