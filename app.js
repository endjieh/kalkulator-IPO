// Main Application Logic
class IPOCalculator {
    constructor() {
        this.portfolio = portfolio;
        this.priceAPI = priceAPI;
        this.livePrice = new Map();
        this.updateIntervals = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPortfolio();
        this.updateDashboard();
    }

    setupEventListeners() {
        // Add Position Form
        const addForm = document.getElementById('addPositionForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddPosition(e));
        }

        // Stock Code Input - Show currency hint
        const stockCodeInput = document.getElementById('stockCode');
        if (stockCodeInput) {
            stockCodeInput.addEventListener('input', (e) => this.updateCurrencyHint(e.target.value));
        }

        // Sell Position Modal
        const sellModal = document.getElementById('sellModal');
        const closeBtn = document.querySelector('.close');
        const cancelBtn = document.getElementById('cancelSell');
        const sellForm = document.getElementById('sellForm');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSellModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSellModal());
        }

        if (sellForm) {
            sellForm.addEventListener('submit', (e) => this.handleSellPosition(e));
        }

        // Real-time price updates
        setInterval(() => this.updateAllPrices(), 1000);
    }

    updateCurrencyHint(stockCode) {
        const isIndonesian = this.priceAPI.isIndonesianStock(stockCode);
        const buyPriceLabel = document.querySelector('label[for="buyPrice"]');
        const sellPriceLabel = document.querySelector('label[for="sellPrice"]');
        const currency = isIndonesian ? 'Rp' : '$';
        
        if (buyPriceLabel) {
            buyPriceLabel.textContent = `Buy Price (${currency}):`;
        }
        if (sellPriceLabel) {
            sellPriceLabel.textContent = `Sell Price (${currency}):`;
        }
    }

    handleAddPosition(e) {
        e.preventDefault();

        const accountName = document.getElementById('accountName').value.trim();
        const stockCode = document.getElementById('stockCode').value.trim();
        const lot = parseFloat(document.getElementById('lot').value);
        const buyPrice = parseFloat(document.getElementById('buyPrice').value);
        const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;

        if (!accountName || !stockCode || !lot || !buyPrice) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (lot <= 0 || buyPrice <= 0) {
            this.showToast('Lot and Buy Price must be positive', 'error');
            return;
        }

        const position = {
            accountName,
            stockCode: stockCode.toUpperCase(),
            lot,
            buyPrice,
            sellPrice,
            remainingLot: lot,
            status: 'holding',
            isIndonesian: this.priceAPI.isIndonesianStock(stockCode)
        };

        try {
            this.portfolio.addPosition(position);
            this.showToast(`${stockCode} added to portfolio!`, 'success');
            document.getElementById('addPositionForm').reset();
            this.renderPortfolio();
            this.updateDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    openSellModal(positionId) {
        const position = this.portfolio.getPosition(positionId);
        if (!position) return;

        this.currentSellPositionId = positionId;
        const modal = document.getElementById('sellModal');
        const maxQtyText = document.getElementById('maxQuantity');
        const sellQtyInput = document.getElementById('sellQuantity');
        const sellPriceLabel = document.querySelector('label[for="sellPriceInput"]');

        maxQtyText.textContent = `Max quantity: ${position.remainingLot.toFixed(4)}`;
        sellQtyInput.max = position.remainingLot;
        sellQtyInput.value = '';
        document.getElementById('sellPriceInput').value = '';
        document.getElementById('realizedGainPreview').textContent = '$0.00';

        // Update currency label
        const currency = position.isIndonesian ? 'Rp' : '$';
        if (sellPriceLabel) {
            sellPriceLabel.textContent = `Sell Price (${currency}):`;
        }

        modal.classList.add('show');
    }

    closeSellModal() {
        const modal = document.getElementById('sellModal');
        modal.classList.remove('show');
        this.currentSellPositionId = null;
    }

    handleSellPosition(e) {
        e.preventDefault();

        const positionId = this.currentSellPositionId;
        const position = this.portfolio.getPosition(positionId);
        const quantity = parseFloat(document.getElementById('sellQuantity').value);
        const sellPrice = parseFloat(document.getElementById('sellPriceInput').value);

        if (!quantity || !sellPrice) {
            this.showToast('Please enter quantity and sell price', 'error');
            return;
        }

        if (quantity > position.remainingLot) {
            this.showToast('Cannot sell more than remaining quantity', 'error');
            return;
        }

        try {
            const transaction = this.portfolio.sellPosition(positionId, quantity, sellPrice);
            const currency = position.isIndonesian ? 'Rp' : '$';
            this.showToast(`Sold ${quantity} shares of ${position.stockCode} for ${currency}${(quantity * sellPrice).toFixed(2)}`, 'success');
            this.closeSellModal();
            this.renderPortfolio();
            this.updateDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async updateAllPrices() {
        const positions = this.portfolio.getAllPositions();
        const symbols = [...new Set(positions.map(p => p.stockCode))];

        for (const symbol of symbols) {
            try {
                const price = await this.priceAPI.fetchPrice(symbol);
                if (price) {
                    this.livePrice.set(symbol, price);
                    this.priceAPI.notifyPriceUpdate(symbol, price);
                    this.updatePriceInTable(symbol, price);
                }
            } catch (error) {
                console.error(`Error updating price for ${symbol}:`, error);
            }
        }
    }

    updatePriceInTable(symbol, price) {
        const cells = document.querySelectorAll(`[data-symbol="${symbol}"][data-column="livePrice"]`);
        cells.forEach(cell => {
            const position = this.portfolio.getAllPositions().find(p => p.stockCode === symbol);
            const currency = position && position.isIndonesian ? 'Rp' : '$';
            cell.textContent = `${currency}${price.toFixed(2)}`;
            cell.classList.add('price-updated');
            setTimeout(() => cell.classList.remove('price-updated'), 500);
        });

        // Update gain/loss calculations
        this.updatePortfolioCalculations(symbol, price);
    }

    updatePortfolioCalculations(symbol, price) {
        const positions = this.portfolio.getAllPositions().filter(p => p.stockCode === symbol);
        
        positions.forEach(position => {
            const unrealizedGain = this.portfolio.calculateUnrealizedGain(position.id, price);
            const realizedGain = this.portfolio.calculateRealizedGain(position.id);
            const totalGain = unrealizedGain + realizedGain;

            // Update table cells
            const row = document.querySelector(`[data-position-id="${position.id}"]`);
            if (row) {
                const currency = position.isIndonesian ? 'Rp' : '$';
                const unrealizedCell = row.querySelector('[data-column="unrealizedGain"]');
                const unrealizedPercentCell = row.querySelector('[data-column="unrealizedPercent"]');
                const realizedCell = row.querySelector('[data-column="realizedGain"]');
                const totalCell = row.querySelector('[data-column="totalGain"]');

                if (unrealizedCell) {
                    unrealizedCell.textContent = `${currency}${unrealizedGain.toFixed(2)}`;
                    unrealizedCell.className = unrealizedGain >= 0 ? 'positive' : 'negative';
                }

                if (unrealizedPercentCell) {
                    const percent = ((unrealizedGain) / (position.remainingLot * position.buyPrice)) * 100;
                    unrealizedPercentCell.textContent = `${percent.toFixed(2)}%`;
                    unrealizedPercentCell.className = percent >= 0 ? 'positive' : 'negative';
                }

                if (realizedCell) {
                    realizedCell.textContent = `${currency}${realizedGain.toFixed(2)}`;
                    realizedCell.className = realizedGain >= 0 ? 'positive' : 'negative';
                }

                if (totalCell) {
                    totalCell.textContent = `${currency}${totalGain.toFixed(2)}`;
                    totalCell.className = totalGain >= 0 ? 'positive' : 'negative';
                }
            }
        });

        this.updateDashboard();
    }

    renderPortfolio() {
        const tbody = document.getElementById('portfolioBody');
        const positions = this.portfolio.getAllPositions();

        if (positions.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="12">No positions added yet. Add your first position above!</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        positions.forEach(position => {
            const livePrice = this.livePrice.get(position.stockCode) || 0;
            const unrealizedGain = this.portfolio.calculateUnrealizedGain(position.id, livePrice);
            const realizedGain = this.portfolio.calculateRealizedGain(position.id);
            const totalGain = unrealizedGain + realizedGain;
            const unrealizedPercent = position.remainingLot > 0 ? 
                ((unrealizedGain) / (position.remainingLot * position.buyPrice)) * 100 : 0;

            const currency = position.isIndonesian ? 'Rp' : '$';

            const row = document.createElement('tr');
            row.setAttribute('data-position-id', position.id);

            const statusText = position.remainingLot === position.lot ? 'Holding' : 
                               position.remainingLot > 0 ? 'Partial' : 'Closed';
            const statusClass = position.remainingLot === position.lot ? 'status-holding' : 
                               position.remainingLot > 0 ? 'status-partial' : 'status-closed';

            row.innerHTML = `
                <td>${position.accountName}</td>
                <td>${position.stockCode}</td>
                <td>${position.remainingLot.toFixed(4)}</td>
                <td>${currency}${position.buyPrice.toFixed(2)}</td>
                <td data-symbol="${position.stockCode}" data-column="livePrice">${currency}${livePrice.toFixed(2)}</td>
                <td>${currency}${position.sellPrice > 0 ? position.sellPrice.toFixed(2) : '-'}</td>
                <td data-column="unrealizedGain" class="${unrealizedGain >= 0 ? 'positive' : 'negative'}">${currency}${unrealizedGain.toFixed(2)}</td>
                <td data-column="unrealizedPercent" class="${unrealizedPercent >= 0 ? 'positive' : 'negative'}">${unrealizedPercent.toFixed(2)}%</td>
                <td data-column="realizedGain" class="${realizedGain >= 0 ? 'positive' : 'negative'}">${currency}${realizedGain.toFixed(2)}</td>
                <td data-column="totalGain" class="${totalGain >= 0 ? 'positive' : 'negative'}">${currency}${totalGain.toFixed(2)}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-group">
                        ${position.remainingLot > 0 ? `<button class="btn btn-danger" onclick="app.openSellModal('${position.id}')">Sell</button>` : ''}
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    updateDashboard() {
        const positions = this.portfolio.getAllPositions();
        let totalInvestment = 0;
        let currentValue = 0;
        let totalUnrealizedGain = 0;
        let totalRealizedGain = this.portfolio.calculateTotalRealizedGain();

        // Group by currency to show both IDR and USD
        let totalInvestmentUSD = 0;
        let currentValueUSD = 0;
        let totalUnrealizedGainUSD = 0;

        let totalInvestmentIDR = 0;
        let currentValueIDR = 0;
        let totalUnrealizedGainIDR = 0;

        positions.forEach(position => {
            const livePrice = this.livePrice.get(position.stockCode) || position.buyPrice;
            const investAmount = position.lot * position.buyPrice;
            const currValue = position.remainingLot * livePrice;
            const unrealGain = this.portfolio.calculateUnrealizedGain(position.id, livePrice);

            if (position.isIndonesian) {
                totalInvestmentIDR += investAmount;
                currentValueIDR += currValue;
                totalUnrealizedGainIDR += unrealGain;
            } else {
                totalInvestmentUSD += investAmount;
                currentValueUSD += currValue;
                totalUnrealizedGainUSD += unrealGain;
            }

            totalInvestment += investAmount;
            currentValue += currValue;
            totalUnrealizedGain += unrealGain;
        });

        const totalGain = totalUnrealizedGain + totalRealizedGain;
        const overallReturn = totalInvestment > 0 ? (totalGain / totalInvestment) * 100 : 0;

        const updateMetric = (elementId, valueUSD, valueIDR, isPercent = false) => {
            const element = document.getElementById(elementId);
            if (element) {
                let displayValue = '';
                if (isPercent) {
                    displayValue = overallReturn.toFixed(2) + '%';
                } else {
                    if (valueUSD > 0 && valueIDR > 0) {
                        displayValue = `$${valueUSD.toFixed(2)} + Rp${valueIDR.toFixed(2)}`;
                    } else if (valueUSD > 0) {
                        displayValue = `$${valueUSD.toFixed(2)}`;
                    } else if (valueIDR > 0) {
                        displayValue = `Rp${valueIDR.toFixed(2)}`;
                    } else {
                        displayValue = '$0.00';
                    }
                }
                element.textContent = displayValue;
                const totalValue = valueUSD + valueIDR;
                element.className = totalValue >= 0 ? 'positive' : 'negative';
            }
        };

        updateMetric('totalInvestment', totalInvestmentUSD, totalInvestmentIDR);
        updateMetric('currentValue', currentValueUSD, currentValueIDR);
        
        // Realized and Unrealized Gain
        const realizedElement = document.getElementById('realizedGain');
        if (realizedElement) {
            realizedElement.textContent = totalRealizedGain >= 0 ? `$${totalRealizedGain.toFixed(2)}` : `-$${Math.abs(totalRealizedGain).toFixed(2)}`;
            realizedElement.className = totalRealizedGain >= 0 ? 'positive' : 'negative';
        }

        const unrealElement = document.getElementById('unrealizedGain');
        if (unrealElement) {
            unrealElement.textContent = totalUnrealizedGain >= 0 ? `$${totalUnrealizedGain.toFixed(2)}` : `-$${Math.abs(totalUnrealizedGain).toFixed(2)}`;
            unrealElement.className = totalUnrealizedGain >= 0 ? 'positive' : 'negative';
        }

        const overallElement = document.getElementById('overallReturn');
        if (overallElement) {
            overallElement.textContent = overallReturn.toFixed(2) + '%';
            overallElement.className = overallReturn >= 0 ? 'positive' : 'negative';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new IPOCalculator();
});
