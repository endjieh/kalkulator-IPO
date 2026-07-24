// Portfolio Management
class Portfolio {
    constructor() {
        this.positions = this.loadPositions();
        this.transactions = this.loadTransactions();
    }

    loadPositions() {
        const stored = localStorage.getItem('ipo_portfolio');
        return stored ? JSON.parse(stored) : [];
    }

    loadTransactions() {
        const stored = localStorage.getItem('ipo_transactions');
        return stored ? JSON.parse(stored) : [];
    }

    savePositions() {
        localStorage.setItem('ipo_portfolio', JSON.stringify(this.positions));
    }

    saveTransactions() {
        localStorage.setItem('ipo_transactions', JSON.stringify(this.transactions));
    }

    addPosition(position) {
        // Check if position already exists
        const existing = this.positions.find(
            p => p.accountName === position.accountName && 
                p.stockCode === position.stockCode.toUpperCase()
        );

        if (existing && existing.remainingLot > 0) {
            // Merge with existing position
            const totalCost = (existing.lot * existing.buyPrice) + (position.lot * position.buyPrice);
            const totalLot = existing.lot + position.lot;
            existing.lot = totalLot;
            existing.buyPrice = totalCost / totalLot;
            existing.createdAt = existing.createdAt;
            existing.updatedAt = new Date().toISOString();
        } else {
            // Create new position
            position.id = 'pos_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            position.stockCode = position.stockCode.toUpperCase();
            position.remainingLot = position.lot;
            position.createdAt = new Date().toISOString();
            position.updatedAt = new Date().toISOString();
            this.positions.push(position);
        }

        this.savePositions();
        return true;
    }

    sellPosition(positionId, quantityToSell, sellPrice) {
        const position = this.positions.find(p => p.id === positionId);
        if (!position) return false;

        if (quantityToSell > position.remainingLot) {
            throw new Error('Cannot sell more than remaining quantity');
        }

        // Record transaction
        const transaction = {
            id: 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            positionId: positionId,
            type: 'sell',
            quantity: quantityToSell,
            price: sellPrice,
            costBasis: quantityToSell * position.buyPrice,
            saleProceeds: quantityToSell * sellPrice,
            realizedGain: (quantityToSell * sellPrice) - (quantityToSell * position.buyPrice),
            timestamp: new Date().toISOString()
        };

        this.transactions.push(transaction);
        position.remainingLot -= quantityToSell;
        
        // If position is fully sold, mark it as closed
        if (position.remainingLot <= 0) {
            position.remainingLot = 0;
            position.status = 'closed';
        } else {
            position.status = 'partial';
        }

        position.updatedAt = new Date().toISOString();
        this.savePositions();
        this.saveTransactions();

        return transaction;
    }

    getPosition(positionId) {
        return this.positions.find(p => p.id === positionId);
    }

    getAllPositions() {
        return this.positions;
    }

    getPositionTransactions(positionId) {
        return this.transactions.filter(t => t.positionId === positionId);
    }

    calculateRealizedGain(positionId) {
        const transactions = this.getPositionTransactions(positionId);
        return transactions.reduce((sum, t) => sum + t.realizedGain, 0);
    }

    calculateUnrealizedGain(positionId, livePrice) {
        const position = this.getPosition(positionId);
        if (!position) return 0;
        return (position.remainingLot * livePrice) - (position.remainingLot * position.buyPrice);
    }

    calculateTotalInvestment() {
        return this.positions.reduce((sum, p) => sum + (p.lot * p.buyPrice), 0);
    }

    calculateTotalRealizedGain() {
        return this.transactions.reduce((sum, t) => sum + t.realizedGain, 0);
    }
}

const portfolio = new Portfolio();