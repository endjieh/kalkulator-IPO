// Yahoo Finance API Integration
class StockPriceAPI {
    constructor() {
        this.cache = new Map();
        this.updateInterval = 1000; // Update every second
        this.priceSubscribers = new Map();
    }

    // Use RapidAPI Yahoo Finance endpoint
    async fetchStockPrice(symbol) {
        // Check cache first (if less than 5 seconds old)
        if (this.cache.has(symbol)) {
            const cached = this.cache.get(symbol);
            if (Date.now() - cached.timestamp < 5000) {
                return cached.price;
            }
        }

        try {
            // Using free Yahoo Finance API through rapid-api
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY', // User will need to add their key
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
            // Return cached price if available, even if old
            if (this.cache.has(symbol)) {
                return this.cache.get(symbol).price;
            }
            return null;
        }
    }

    // Alternative: Use free API without authentication
    async fetchStockPriceFree(symbol) {
        try {
            // Using alternative free API
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

    // Subscribe to price updates
    subscribeToPriceUpdates(symbol, callback) {
        if (!this.priceSubscribers.has(symbol)) {
            this.priceSubscribers.set(symbol, []);
        }
        this.priceSubscribers.get(symbol).push(callback);
    }

    // Unsubscribe from price updates
    unsubscribeFromPriceUpdates(symbol, callback) {
        if (!this.priceSubscribers.has(symbol)) return;
        const subscribers = this.priceSubscribers.get(symbol);
        const index = subscribers.indexOf(callback);
        if (index > -1) {
            subscribers.splice(index, 1);
        }
    }

    // Notify all subscribers of price update
    notifyPriceUpdate(symbol, price) {
        if (this.priceSubscribers.has(symbol)) {
            this.priceSubscribers.get(symbol).forEach(callback => {
                callback(price);
            });
        }
    }
}

const priceAPI = new StockPriceAPI();