// Stock Price API Integration - Supports US & Indonesia Stocks
class StockPriceAPI {
    constructor() {
        this.cache = new Map();
        this.updateInterval = 1000;
        this.priceSubscribers = new Map();
    }

    isIndonesianStock(symbol) {
        if (!symbol) return false;
        const upper = symbol.toUpperCase();
        return upper.includes('.JK') || this.isCommonIndonesianStock(upper);
    }

    isCommonIndonesianStock(symbol) {
        const indonesianStocks = ['BBCA', 'BBRI', 'BNI', 'BRI', 'ASII', 'TLKM', 'UNVR', 'INDF', 'JSMR', 'BMRI'];
        return indonesianStocks.includes(symbol.toUpperCase());
    }

    async fetchStockPrice(symbol) {
        if (this.cache.has(symbol)) {
            const cached = this.cache.get(symbol);
            if (Date.now() - cached.timestamp < 5000) {
                return cached.price;
            }
        }

        try {
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY',
                    'x-rapidapi-host': 'yh-finance.p.rapidapi.com'
                }
            };

            const response = await fetch(
                `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}`,
                options
            );

            if (!response.ok) {
                throw new Error('API Error');
            }

            const data = await response.json();
            const price = data.price?.regularMarketPrice || 0;

            this.cache.set(symbol, {
                price: price,
                timestamp: Date.now()
            });

            return price;
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            if (this.cache.has(symbol)) {
                return this.cache.get(symbol).price;
            }
            return null;
        }
    }

    async fetchStockPriceFree(symbol) {
        try {
            const response = await fetch(
                `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`
            );

            if (!response.ok) {
                throw new Error('API Error');
            }

            const data = await response.json();
            const quote = data.quoteResponse?.result?.[0];
            
            if (quote && quote.regularMarketPrice) {
                this.cache.set(symbol, {
                    price: quote.regularMarketPrice,
                    timestamp: Date.now()
                });
                return quote.regularMarketPrice;
            }

            return null;
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            if (this.cache.has(symbol)) {
                return this.cache.get(symbol).price;
            }
            return null;
        }
    }

    async fetchIndonesianStockPrice(symbol) {
        if (this.cache.has(symbol)) {
            return this.cache.get(symbol).price;
        }
        console.warn(`Indonesia stock ${symbol} price not available. Use manual price input.`);
        return null;
    }

    async fetchPrice(symbol) {
        if (this.isIndonesianStock(symbol)) {
            return await this.fetchIndonesianStockPrice(symbol);
        } else {
            return await this.fetchStockPriceFree(symbol);
        }
    }

    subscribeToPriceUpdates(symbol, callback) {
        if (!this.priceSubscribers.has(symbol)) {
            this.priceSubscribers.set(symbol, []);
        }
        this.priceSubscribers.get(symbol).push(callback);
    }

    unsubscribeFromPriceUpdates(symbol, callback) {
        if (!this.priceSubscribers.has(symbol)) return;
        const subscribers = this.priceSubscribers.get(symbol);
        const index = subscribers.indexOf(callback);
        if (index > -1) {
            subscribers.splice(index, 1);
        }
    }

    notifyPriceUpdate(symbol, price) {
        if (this.priceSubscribers.has(symbol)) {
            this.priceSubscribers.get(symbol).forEach(callback => {
                callback(price);
            });
        }
    }

    setManualPrice(symbol, price) {
        this.cache.set(symbol, {
            price: price,
            timestamp: Date.now()
        });
        this.notifyPriceUpdate(symbol, price);
    }
}

const priceAPI = new StockPriceAPI();
