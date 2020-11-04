'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ArgumentsRequired, InsufficientFunds, OrderNotFound, BadResponse, BadRequest } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class acx extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'aax',
            'name': 'AAX',
            'countries': ['MT'],
            'enableRateLimit': true,
            'rateLimit': 1000,
            'version': 'v2',
            'v1': 'marketdata/v1',
            'has': {
                'cancelAllOrders': true,
                'createLimitOrder': false,
                'createMarketOrder': false,
                'cancelOrder': true,
                'createOrder': true,
                'editOrder': true,
                'fetchBalance': true,
                'fetchClosedOrders': true,
                'fetchDepositAddress': false,
                'fetchMarkets': true,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOrderBook': true,
                'fetchOrderTrades': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTrades': true,

            },
            'timeframes': {
                '1m': '1',
                '5m': '5',
                '15m': '15',
                '30m': '30',
                '1h': '60',
                '2h': '120',
                '4h': '240',
                '12h': '720',
                '1d': '1440',
                '3d': '4320',
                '1w': '10080',
            },
            'urls': {
                'logo': 'https://www.aaxpro.com/static/images/logo/AAX_Logo.png',
                'api': 'https://api.aaxpro.com',
                'www': 'https://www.aaxpro.com', // string website URL
                'doc': 'https://www.aax.com/apidoc/index.html',
            },
            'api': {
                'public': {
                    'get': [
                        'instruments', // This endpoint is used to retrieve all instruments information.
                        'market/candles', // Get OHLC(k line) of specific market
                        'getHistMarketData', // Get OHLC(k line) of specific market v1
                        'market/orderbook', // This endpoint allows you to retrieve the current order book for a specific symbol.
                        'market/tickers', // This endpoint allows you to retrieve the trading summary for all symbol in the last 24 hours
                        'market/trades', // Get the Most Recent Trades

                        'order_book', // Get the order book of specified market
                        'order_book/{market}',
                        'trades', // Get recent trades on market, each trade is included only once Trades are sorted in reverse creation order.
                        'trades/{market}',
                        'tickers', // Get ticker of all markets
                        'tickers/{market}', // Get ticker of specific market
                        'timestamp', // Get server current time, in seconds since Unix epoch
                    ],
                },
                'private': {
                    'get': [
                        'account/balances', // Retrieve user wallet balances.
                        'account/deposit/address',

                        'futures/openOrders', // Retrieve future open orders
                        'futures/trades', // This endpoint is used to retrieve your orders execution details
                        'futures/orders', // Retrieve historical futures orders

                        'spot/openOrders', // Retrieve spot open orders
                        'spot/orders', // Retrieve historical spot orders
                        'spot/trades', // This endpoint is used to retrieve your orders execution details

                    ],
                    'post': [
                        'futures/openOrders', // This endpoint is used to retrieve future open orders
                        'futures/orders', // This endpoint is used for placing future orders

                        'spot/openOrders', // This endpoint is used to retrieve spot open orders
                        'spot/orders', // This endpoint is used for placing spot orders

                    ],
                    'delete': [
                        'futures/orders/cancel/all', // Cancle all future Order
                        'futures/orders/cancel/{orderID}', // Cancel future Order

                        'spot/orders/cancel/all', // Cancle all spot Orders
                        'spot/orders/cancel/{orderID}', // Cancel Spot Order

                    ],
                    'put': [
                        'futures/orders', // This endpoint is used to amend the quantity or price of an open order.
                        'spot/orders', // This endpoint is used to amend the quantity or price of an open order.

                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'maker': 0.2 / 100,
                    'taker': 0.2 / 100,
                },
                'funding': {
                    'tierBased': false,
                    'percentage': true,
                    'withdraw': {}, // There is only 1% fee on withdrawals to your bank account.
                },
            },
            'commonCurrencies': {
                'PLA': 'Plair',
            },
            'exceptions': {
                '2002': InsufficientFunds,
                '2003': OrderNotFound,
            },
            'options': {
                'defaultType': 'spot', // 'spot', 'future'
            },
        });
    }

    async cancelAllOrders (symbol = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' cancelAllOrders() requires a symbol argument');
        }
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
        };
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot'
            ? await this.privateDeleteSpotOrdersCancelAll (this.extend (request, params))
            : await this.privateDeleteFuturesOrdersCancelAll (this.extend (request, params));
        return { 'info': response };
    }

    // async createLimitOrder (symbol, side, amount, price = undefined, params = {}) {
    //     return this.createOrder (symbol, 'LIMIT', side, amount, price, params);
    // }

    // async createMarketOrder (symbol, side, amount, price = undefined, params = {}) {
    //     return this.createOrder (symbol, 'MARKET', side, amount, price, params);
    // }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        delete params.type;
        // delete this.options.defaultType;
        return this.fetchOrders (symbol, since, limit, this.extend ({ 'orderStatus': 2 }, params));
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        if (!id) {
            throw new ArgumentsRequired (this.id + ' cancelAllOrders() requires a symbol argument');
        }
        await this.loadMarkets ();
        const request = {
            'orderID': id,
        };
        symbol = this.dealSymbol (symbol, params);
        this.market (symbol);
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot'
            ? await this.privateDeleteSpotOrdersCancelOrderID (request)
            : await this.privateDeleteFuturesOrdersCancelOrderID (request);
        if (response && response.code !== 1) {
            throw new BadResponse (response.message);
        }
        // const response={
        //     "code":1,
        //     "data":{
        //        "avgPrice":"0",
        //        "base":"BTC",
        //        "clOrdID":"aax",
        //        "commission":"0",
        //        "createTime":"2019-11-12T03:46:41Z",
        //        "cumQty":"0",
        //        "id":"114330021504606208",
        //        "isTriggered":false,
        //        "lastPrice":"0",
        //        "lastQty":"0",
        //        "leavesQty":"0",
        //        "orderID":"wJ4L366KB",
        //        "orderQty":"0.05",
        //        "orderStatus":1,
        //        "orderType":2,
        //        "price":"8000",
        //        "quote":"USDT",
        //        "rejectCode":0,
        //        "rejectReason":null,
        //        "side":1,
        //        "stopPrice":"0",
        //        "symbol":"BTCUSDT",
        //        "transactTime":null,
        //        "updateTime":"2019-11-12T03:46:41Z",
        //        "timeInForce":1,
        //        "userID":"216214"
        //     },
        //     "message":"success",
        //     "ts":1573530402029
        //  }
        let order = this.extend (response.data, { 'ts': response.ts });
        order = this.parseOrder (order);
        const status = order['status'];
        if (status === 'closed' || status === 'canceled') {
            throw new OrderNotFound (this.id + ' ' + this.json (order));
        }
        return order;
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        if (!(symbol && type && side && amount)) {
            throw new ArgumentsRequired (this.id + ' createOrder  lack of arguments');
        }
        type = type.toUpperCase ();
        side = side.toUpperCase ();
        if (['MARKET', 'LIMIT', 'SPOT', 'STOP-LIMIT'].indexOf (type) < 0) {
            throw new BadRequest ('type must be MARKET, LIMIT, SPOT or STOP-LIMIT');
        }
        await this.loadMarkets ();
        const request = {
            'orderType': type,
            'symbol': this.marketId (symbol),
            'orderQty': amount,
            'stopPrice': params['stopPrice'],
            'timeInForce': params['timeInForce'] || 'GTC',
            'side': side,
        };
        if (type === 'LIMIT' || type === 'STOP-LIMIT') {
            if (!price) {
                throw new ArgumentsRequired (this.id + ' createOrder LIMIT or STOP-LIMIT need price argument');
            }
            request['price'] = price.toString ();
        }
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot'
            ? await this.privatePostSpotOrders (this.extend (request, params))
            : await this.privatePostFuturesOrders (this.extend (request, params));
        if (response && response.code !== 1) {
            throw new BadResponse (response.message);
        }
        // const response={
        //     "code":1,
        //     "data":{
        //        "avgPrice":"0",
        //        "base":"BTC",
        //        "clOrdID":"aax_futures",
        //        "code":"FP",
        //        "commission":"0",
        //        "createTime":null,
        //        "cumQty":"0",
        //        "id":"114375893764395008",
        //        "isTriggered":null,
        //        "lastPrice":"0",
        //        "lastQty":null,
        //        "leavesQty":"100",
        //        "leverage":"1",
        //        "liqType":0,
        //        "marketPrice":"8760.7500000000",
        //        "orderID":"wJTewQc81",
        //        "orderQty":"100",
        //        "orderStatus":0,
        //        "orderType":2,
        //        "price":"8000",
        //        "quote":"USD",
        //        "rejectCode":null,
        //        "rejectReason":null,
        //        "settleType":"INVERSE",
        //        "side":1,
        //        "stopPrice":null,
        //        "symbol":"BTCUSDFP",
        //        "transactTime":null,
        //        "updateTime":null,
        //        "timeInForce":1,
        //        "execInst": "",
        //        "userID":"216214"
        //     },
        //     "message":"success",
        //     "ts":1573541338074
        //  }
        const order = this.extend (response.data, { 'ts': response.ts });
        return this.parseOrder (order);
    }

    async editOrder (id, symbol, amount = undefined, price = undefined, stopPrice = undefined, params = {}) {
        if (!id) {
            throw new ArgumentsRequired (this.id + ' editOrder need orderId argument');
        }
        await this.loadMarkets ();
        const request = {
            'orderID': id,
        };
        symbol = this.dealSymbol (symbol, params);
        if (symbol) {
            request['symbol'] = this.marketId (symbol);
        }
        if (amount) {
            request['orderQty'] = amount;
        }
        if (price) {
            request['price'] = price;
        }
        if (stopPrice) {
            request['stopPrice'] = stopPrice;
        }
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot'
            ? await this.privatePutSpotOrders (request)
            : await this.privatePutFuturesOrders (request);
        if (response && response.code !== 1) {
            throw new BadResponse (response.message);
        }
        // const response={
        //     "code":1,
        //     "data":{
        //        "avgPrice":"0",
        //        "base":"BTC",
        //        "clOrdID":"aax",
        //        "commission":"0",
        //        "createTime":"2019-11-12T03:46:41Z",
        //        "cumQty":"0",
        //        "id":"114330021504606208",
        //        "isTriggered":false,
        //        "lastPrice":"0",
        //        "lastQty":"0",
        //        "leavesQty":"0.05",
        //        "orderID":"wJ4L366KB",
        //        "orderQty":"0.05",
        //        "orderStatus":1,
        //        "orderType":2,
        //        "price":"8000",
        //        "quote":"USDT",
        //        "rejectCode":0,
        //        "rejectReason":null,
        //        "side":1,
        //        "stopPrice":"0",
        //        "symbol":"BTCUSDT",
        //        "transactTime":null,
        //        "updateTime":"2019-11-12T03:46:41Z",
        //        "timeInForce":1,
        //        "userID":"216214"
        //     },
        //     "message":"success",
        //     "ts":1573530401494
        // }
        const order = this.extend (response.data, { 'ts': response.ts });
        return this.parseOrder (order);
    }

    purseType () {
        return {
            'spot': 'SPTP',
            'future': 'FUTP',
            'otc': 'F2CP',
            'saving': 'VLTP',
        };
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        const type = this.safeString (params, 'type') || this.options.defaultType;
        this.checkParams (params, ['spot', 'future', 'otc', 'saving']);
        const purseType = this.purseType ();
        const response = await this.privateGetAccountBalances ({ 'purseType': purseType[type] });
        // const response = {
        //     'code': 1,
        //     'message': 'success',
        //     'ts': 1603187218565,
        //     'data': [
        //         {
        //             'purseType': 'SPTP',
        //             'currency': 'USDT',
        //             'available': '9402.93025232',
        //             'unavailable': '47.92316768',
        //         },
        //         {
        //             'purseType': 'SPTP',
        //             'currency': 'BTC',
        //             'available': '0.14995000',
        //             'unavailable': '0.00000000',
        //         },
        //         {
        //             'purseType': 'RWDP',
        //             'currency': 'BTC',
        //             'available': '0.00030000',
        //             'unavailable': '0.00200000',
        //         },
        //         {
        //             'purseType': 'FUTP',
        //             'currency': 'BTC',
        //             'available': '0.02000000',
        //             'unavailable': '0.20030000',
        //         },
        //     ],
        // };
        // RWDP
        const balances = this.safeValue (response, 'data');
        const result = { 'info': balances };
        for (let i = 0; i < balances.length; i++) {
            const balance = balances[i];
            const currencyId = this.safeString (balance, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const account = this.account ();
            account['free'] = this.safeFloat (balance, 'available');
            account['used'] = this.safeFloat (balance, 'unavailable');
            account['total'] = this.safeFloat (balance, 'available') + this.safeFloat (balance, 'unavailable');
            result[code] = account;
        }
        return this.parseBalance (result);
    }

    // async fetchDepositAddress (params = {}) {
    //     const request = {
    //         'currency': params['currency'],
    //         'network': params['network'],
    //     };
    //     const response = await this.privateGetAccountDepositAddress (this.extend (request, params));
    //     const data = response.data;
    //     return {
    //         'currency': this.safeString (data, 'currency'),
    //         'address': this.safeString (data, 'address'),
    //         'tag': this.safeString (data, 'tag'),
    //         'info': data,
    //     };
    // }

    async fetchMarkets (params = {}) {
        const response = await this.publicGetInstruments (params);
        // const response = { 'code': 1,
        //     'message': 'success',
        //     'ts': 1603264508726,
        //     'data': [
        //         {
        //             'tickSize': '0.01',
        //             'lotSize': '1',
        //             'base': 'BTC',
        //             'quote': 'USDT',
        //             'minQuantity': '1.0000000000',
        //             'maxQuantity': '30000',
        //             'minPrice': '0.0100000000',
        //             'maxPrice': '999999.0000000000',
        //             'status': 'enable',
        //             'symbol': 'BTCUSDT',
        //             'code': '',
        //             'takerFee': '0.00040',
        //             'makerFee': '0.00020',
        //             'multiplier': '0.001000000000',
        //             'mmRate': '0.00500',
        //             'imRate': '0.01000',
        //             'type': 'futures',
        //             'settleType': 'Vanilla',
        //             'settleCurrency': 'USDT',
        //         }] };
        const markets = response['data'];
        const result = [];
        for (let i = 0; i < markets.length; i++) {
            const market = markets[i];
            const id = market['symbol'];
            const base = market['base'].toUpperCase ();
            const quote = market['quote'].toUpperCase ();
            const baseId = base.toLowerCase ();
            const quoteId = quote.toLowerCase ();
            const active = !!(market['status'] === 'enable');
            const taker = market['takerFee'];
            const maker = market['makerFee'];
            const symbol = base + '/' + quote + (market['code'] || '');
            // todo: find out their undocumented precision and limits
            const precision = {
                'amount': undefined,
                'price': undefined,
                'cost': undefined,
            };
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'precision': precision,
                'info': market,
                'active': active,
                'taker': taker,
                'maker': maker,
                'percentage': false,
                'tierBased': true,
                'limits': {
                    'amount': {
                        'min': market['minQuantity'],
                        'max': market['maxQuantity'],
                    },
                    'price': {
                        'min': market['minPrice'],
                        'max': market['maxPrice'],
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                },
            });
        }
        return result;
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const request = this.dealSinceLimit (since, limit);
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot'
            ? await this.privateGetSpotTrades (this.extend (request, params))
            : await this.privateGetFuturesTrades (this.extend (request, params));
        if (response && response.code !== 1) {
            throw new BadResponse (response.message);
        }
        // const response={
        //     "code":1,
        //     "data":{
        //        "list":[
        //           {
        //              "avgPrice":"8000",
        //              "base":"BTC",
        //              "commission":"0.00000888",
        //              "createTime":"2019-11-12T03:18:35Z",
        //              "cumQty":"0.0148",
        //              "filledPrice":"8000",
        //              "filledQty":"0.0148",
        //              "id":"114322949580906499",
        //              "leavesQty":"0.0052",
        //              "orderID":"wFo9ZPxAJ",
        //              "orderQty":"0.02",
        //              "orderStatus":2,
        //              "orderType":2,
        //              "price":"8000",
        //              "quote":"USDT",
        //              "rejectCode":0,
        //              "rejectReason":null,
        //              "side":1,
        //              "stopPrice":"0",
        //              "symbol":"BTCUSDT",
        //              "taker":false,
        //              "transactTime":"2019-11-12T03:16:16Z",
        //              "updateTime":null,
        //              "userID":"216214"
        //           }
        //        ],
        //        "pageNum":1,
        //        "pageSize":1,
        //        "total":10
        //     },
        //     "message":"success",
        //     "ts":1573532934832
        // }
        const trades = response.data.list;
        return this.parseMyTrades (trades);
    }

    // 需要特殊处理
    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        const dateScale = this.dealTimeFrame (timeframe);
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const [base, quote] = symbol.split ('/');
        const request = {
            'limit': limit || 500,
            'base': base,
            'quote': quote,
            'format': 'array',
            'useV1': true,
            'date_scale': dateScale,

        };
        if (since !== undefined) {
            request['timestamp'] = parseInt (since / 1000);
        }
        const response = await this.publicGetGetHistMarketData (this.extend (request, params));
        return this.parseOHLCVs (response);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const request = this.dealSinceLimit (since, limit);
        symbol = this.dealSymbol (symbol, params);
        if (symbol) {
            request['symbol'] = this.marketId (symbol);
        }
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot'
            ? await this.privateGetSpotOpenOrders (this.extend (request, params))
            : await this.privateGetFuturesOpenOrders (this.extend (request, params));
        // const response={
        //     "code":1,
        //     "data":{
        //        "list":[
        //           {
        //              "avgPrice":"0",
        //              "base":"BTC",
        //              "clOrdID":"aax",
        //              "commission":"0",
        //              "createTime":"2019-11-12T03:41:52Z",
        //              "cumQty":"0",
        //              "id":"114328808516083712",
        //              "isTriggered":false,
        //              "lastPrice":"0",
        //              "lastQty":"0",
        //              "leavesQty":"0",
        //              "orderID":"wJ3qitASB",
        //              "orderQty":"0.02",
        //              "orderStatus":1,
        //              "orderType":2,
        //              "price":"8000",
        //              "quote":"USDT",
        //              "rejectCode":0,
        //              "rejectReason":null,
        //              "side":1,
        //              "stopPrice":"0",
        //              "symbol":"BTCUSDT",
        //              "transactTime":null,
        //              "updateTime":"2019-11-12T03:41:52Z",
        //              "timeInForce":1,
        //              "userID":"216214"
        //           }
        //        ],
        //        "pageNum":1,
        //        "pageSize":2,
        //        "total":2
        //     },
        //     "message":"success",
        //     "ts":1573553718212
        //  }
        const orders = response.data.list;
        const keys = Object.keys (orders);
        const result = [];
        for (let i = 0; i < keys.length; i++) {
            const order = this.extend (orders[i]);
            result.push (this.parseOrder (order));
        }
        return result;
    }

    async fetchOrder (id = undefined, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {};
        if (!id) {
            throw new ArgumentsRequired (this.id + ' editOrder need orderId argument');
        }
        request['orderID'] = id;
        symbol = this.dealSymbol (symbol, params);
        if (symbol) {
            request['symbol'] = this.marketId (symbol);
        }
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        const response = optionType === 'spot' && !(symbol && symbol.endsWith ('FP'))
            ? await this.privateGetSpotOrders (this.extend (request, params))
            : await this.privateGetFuturesOrders (this.extend (request, params));
        // const response={
        //     "code":1,
        //     "data":{
        //        "total":19,
        //        "pageSize":10,
        //        "list":[
        //           {
        //              "orderType":2,
        //              "symbol":"BTCUSDT",
        //              "avgPrice":"0",
        //              "orderStatus":0,
        //              "userID":"7225",
        //              "quote":"USDT",
        //              "rejectReason":null,
        //              "rejectCode":null,
        //              "price":"0",
        //              "orderQty":"0.002",
        //              "commission":"0",
        //              "id":"110419975166304256",
        //              "isTriggered":null,
        //              "side":1,
        //              "orderID":"vBGlDcLwk",
        //              "cumQty":"0",
        //              "leavesQty":"0",
        //              "updateTime":null,
        //              "clOrdID":"0001",
        //              "lastQty":"0",
        //              "stopPrice":"0",
        //              "createTime":"2019-11-01T08:49:33Z",
        //              "transactTime":null,
        //              "timeInForce":1,
        //              "base":"BTC",
        //              "lastPrice":"0"
        //           }
        //        ],
        //        "pageNum":1
        //     },
        //     "message":"success",
        //     "ts":1572598173682
        //  }
        const orders = response.data.list;
        const keys = Object.keys (orders);
        const result = [];
        for (let i = 0; i < keys.length; i++) {
            const order = this.extend (orders[i]);
            result.push (this.parseOrder (order));
        }
        return result;
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const request = this.dealSinceLimit (since, limit);
        this.checkParams (params);
        const optionType = params['type'] || this.options['defaultType'];
        if (symbol) {
            request['symbol'] = this.marketId (symbol);
        }
        const response = optionType === 'spot' && !(symbol && symbol.endsWith ('FP'))
            ? await this.privateGetSpotOrders (this.extend (request, params))
            : await this.privateGetFuturesOrders (this.extend (request, params));
        // const response={
        //     "code":1,
        //     "data":{
        //        "total":19,
        //        "pageSize":10,
        //        "list":[
        //           {
        //              "orderType":2,
        //              "symbol":"BTCUSDT",
        //              "avgPrice":"0",
        //              "orderStatus":0,
        //              "userID":"7225",
        //              "quote":"USDT",
        //              "rejectReason":null,
        //              "rejectCode":null,
        //              "price":"0",
        //              "orderQty":"0.002",
        //              "commission":"0",
        //              "id":"110419975166304256",
        //              "isTriggered":null,
        //              "side":1,
        //              "orderID":"vBGlDcLwk",
        //              "cumQty":"0",
        //              "leavesQty":"0",
        //              "updateTime":null,
        //              "clOrdID":"0001",
        //              "lastQty":"0",
        //              "stopPrice":"0",
        //              "createTime":"2019-11-01T08:49:33Z",
        //              "transactTime":null,
        //              "timeInForce":1,
        //              "base":"BTC",
        //              "lastPrice":"0"
        //           }
        //        ],
        //        "pageNum":1
        //     },
        //     "message":"success",
        //     "ts":1572598173682
        //  }
        const orders = response.data.list;
        const keys = Object.keys (orders);
        const result = [];
        for (let i = 0; i < keys.length; i++) {
            const order = this.extend (orders[i]);
            result.push (this.parseOrder (order));
        }
        return result;
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        if (limit && [20, '20', 50, '50'].indexOf (limit) < 0) {
            throw new BadRequest ('limit must be 20 or 50 ');
        }
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
        };
        request['level'] = limit || 20; // Support 20, 50
        const orderbook = await this.publicGetMarketOrderbook (this.extend (request, params));
        const timestamp = this.safeTimestamp (orderbook, 't') / 1000; // need unix type
        return this.parseOrderBook (orderbook, timestamp);
    }

    async fetchOrderTrades (id, symbol, since = undefined, limit = undefined, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        if (!id) {
            throw new ArgumentsRequired (this.id + ' cancelAllOrders() requires a symbol argument');
        }
        return this.fetchMyTrades (symbol, since, limit, this.extend ({ 'orderID': id }, params));
    }

    async fetchTicker (symbol, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const market = this.market (symbol);
        const value = market['id'];
        const response = await this.publicGetMarketTickers ();
        const ticket = this.extend (this.filterBy (response.tickers, 's', value)[0], { 'at': response['t'] });
        return this.parseTicker (ticket, market);
    }

    async fetchTickers (symbols = [], params = {}) {
        await this.loadMarkets ();
        const response = await this.publicGetMarketTickers ();
        // const response = {
        //     'e': 'tickers',
        //     't': 1592568022678,
        //     'tickers':
        //     [
        //         {
        //             'a': '0.00000000',
        //             'c': '52.50000000',
        //             'd': '-0.94339623',
        //             'h': '53.00000000',
        //             'l': '50.80000000',
        //             'o': '53.00000000',
        //             's': 'ZECUSDT',
        //             'v': '42525.11699994',
        //         },
        //         {
        //             'a': '0.00000000',
        //             'c': '0.00000222',
        //             'd': '-5.53191489',
        //             'h': '0.00000236',
        //             'l': '0.00000216',
        //             'o': '0.00000235',
        //             's': 'ZILBTC',
        //             'v': '5.84912230',
        //         },
        //     ],
        // };
        let tickers = response.tickers;
        const symbolObj = {};
        if (symbols.length) {
            symbols.forEach ((symbol) => {
                symbol = this.dealSymbol (symbol, params);
                symbolObj[this.market (symbol)['id']] = this.market (symbol)['symbol'];
            });
            tickers = tickers.filter ((ticker) => {
                let result = false;
                if (Object.keys (symbolObj).indexOf (ticker['s']) > -1) {
                    ticker.resetSymbol = symbolObj[ticker['s']];
                    result = true;
                }
                return result;
            });
        }
        const result = [];
        for (let index = 0; index < tickers.length; index++) {
            let ticker = tickers[index];
            ticker = this.extend (ticker, { 'at': response['t'] });
            result.push (this.parseTicker (ticker));
        }
        return result;
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        symbol = this.dealSymbol (symbol, params);
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
            'limit': 2, // max 2000
        };
        const response = await this.publicGetMarketTrades (request);
        return this.parseTrades (response.trades, market, since, limit);
    }

    parseOHLCV (ohlcv, market = undefined) {
        return [
            this.safeTimestamp (ohlcv, 't'),
            this.safeFloat (ohlcv, 'o'),
            this.safeFloat (ohlcv, 'h'),
            this.safeFloat (ohlcv, 'l'),
            this.safeFloat (ohlcv, 'c'),
            this.safeFloat (ohlcv, 'v'),
        ];
    }

    parseOHLCVs (ohlcvs, market = undefined, timeframe = '1m', since = undefined) {
        for (let i = 0; i < ohlcvs.length; i++) {
            ohlcvs[i][0] = ohlcvs[i][0] * 1000;
            ohlcvs[i].pop ();
            ohlcvs[i].pop ();
        }
        return ohlcvs;
    }

    parseTicker (ticker, market = undefined) {
        const timestamp = ticker['at'];
        let symbol = ticker['resetSymbol'];
        if (market) {
            symbol = market['symbol'];
        }
        if (symbol && symbol.endsWith ('FP')) {
            symbol = symbol.slice (0, -2);
        }
        delete ticker['resetSymbol'];
        const last = this.safeFloat (ticker, 'c');
        const open = this.safeFloat (ticker, 'o');
        const change = last - open;
        const percentage = (change / open) * 100;
        const average = (last + open) / 2;
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'h'),
            'low': this.safeFloat (ticker, 'l'),
            'bid': undefined,
            'bidVolume': undefined,
            'ask': undefined,
            'askVolume': undefined,
            'vwap': undefined,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': percentage,
            'average': average,
            'baseVolume': undefined,
            'quoteVolume': undefined,
            'info': ticker,
        };
    }

    parseTrade (trade, market = undefined) {
        const timestamp = this.safeString (trade, 't');
        const id = this.safeString (trade, 'tid');
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        if (symbol && symbol.endsWith ('FP')) {
            symbol = symbol.slice (0, -2);
        }
        const price = this.safeFloat (trade, 'p');
        const amount = this.safeFloat (trade, 'q');
        const side = price > 0 ? 'buy' : 'sell';
        const cost = price * amount;
        const currency = symbol ? symbol.split ('/')[1] : 'currency';
        return {
            'info': trade,
            'id': id,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': undefined,
            'side': side,
            'order': undefined,
            'takerOrMaker': undefined,
            'price': Math.abs (price),
            'amount': amount,
            'cost': Math.abs (cost),
            'fee': {
                'cost': undefined,
                'currency': currency,
                'rate': undefined,
            },
        };
    }

    parseMyTrade (trade) {
        const id = this.safeString (trade, 'id');
        const orderId = this.safeString (trade, 'orderID');
        const createTime = this.safeString (trade, 'createTime');
        const timestamp = createTime ? this.getTime (this.safeString (trade, 'createTime')) : undefined;
        let symbol = this.safeString (trade, 'symbol');
        symbol = symbol ? this.marketsById[symbol]['symbol'] : symbol;
        if (symbol && symbol.endsWith ('FP')) {
            symbol = symbol.slice (0, -2);
        }
        const price = this.safeString (trade, 'price');
        const type = this.parseOrderType (this.safeString (trade, 'orderType'));
        const side = this.safeString (trade, 'side') === 1 ? 'Buy' : 'Sell';
        const amount = this.safeString (trade, 'filledQty');
        return {
            'info': trade,
            'id': id,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'order': orderId,
            'takerOrMaker': 'taker',
            'price': price,
            'amount': amount,
            'cost': price * amount,
            'fee': {
                'currency': undefined,
                'cost': undefined,
                'rate': undefined,
            },
        };
    }

    parseMyTrades (trades) {
        const keys = Object.keys (trades);
        const result = [];
        for (let i = 0; i < keys.length; i++) {
            let trade = trades[i];
            trade = this.parseMyTrade (trade);
            result.push (trade);
        }
        return result;
    }

    parseTrades (trades, market = undefined, since = undefined, limit = undefined, params = {}) {
        const ids = Object.keys (trades);
        const list = [];
        for (let i = 0; i < ids.length; i++) {
            const trade = trades[i];
            list.push (this.parseTrade (trade, market));
        }
        trades = list;
        const result = this.sortBy (trades, 'timestamp');
        const symbol = market !== undefined ? (market['symbol'].endsWith ('FP') ? market['symbol'].slice (0, -2) : market['symbol']) : undefined;
        return this.filterBySymbolSinceLimit (result, symbol, since, limit);
    }

    parseOrderStatus (status) {
        const statuses = {
            '0': 'open', // open
            '1': 'open', // open
            '2': 'closed', // closed
            '3': 'closed', // closed
            '4': 'cancled', // cancled
            '5': 'cancled', // cancled
            '6': 'rejected', // Rejected
            '10': 'cancled', // cancled
            '11': 'rejected', // Rejected
        };
        return this.safeString (statuses, status, status);
    }

    parseOrderType (status) {
        const statuses = {
            '1': 'market',
            '2': 'limit',
            '3': 'Stop Order',
            '4': 'Stop-Limit Order',
            '7': 'Stop Loss',
            '8': 'Take Profit',
        };
        return this.safeString (statuses, status, status);
    }

    getTime (time) {
        return new Date (time).getTime ();
    }

    parseOrder (order) {
        const createTime = this.safeString (order, 'createTime');
        const timestamp = createTime ? this.getTime (createTime) : this.safeFloat (order, 'ts');
        const status = this.parseOrderStatus (this.safeString (order, 'orderStatus'));
        const type = this.parseOrderType (this.safeString (order, 'orderType'));
        const side = this.safeString (order, 'side') === 1 ? 'buy' : 'sell';
        const id = this.safeString (order, 'orderID');
        const clientOrderId = this.safeString (order, 'clOrdID');
        let symbol = this.safeString (order, 'symbol');
        symbol = symbol ? this.marketsById[symbol]['symbol'] : symbol;
        if (symbol && symbol.endsWith ('FP')) {
            symbol = symbol.slice (0, -2);
        }
        const price = this.safeFloat (order, 'price');
        const average = this.safeFloat (order, 'avgPrice');
        const amount = this.safeString (order, 'orderQty');
        const filled = this.safeString (order, 'cumQty');
        const remaining = this.safeString (order, 'leavesQty');
        const transactTime = this.safeString (order, 'transactTime');
        const lastTradeTimestamp = transactTime ? new Date (transactTime).getTime () : undefined;
        const currency = undefined;
        return {
            'id': id,
            'clientOrderId': clientOrderId,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': lastTradeTimestamp,
            'status': status,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'average': average,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'rejectReason': this.safeString (order, 'rejectReason'),
            'cost': filled * price,
            'trades': [],
            'info': order,
            'fee': {
                'currency': currency,
                'cost': undefined,
                'rate': undefined,
            },
        };
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let version = this.version;
        if (params['useV1']) {
            version = this.v1;
        }
        let request = '/' + version + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        let url = this.urls['api'] + request;
        if (api === 'public') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else {
            this.checkRequiredCredentials ();
            const nonce = this.nonce ().toString ();
            const privateHeader = {
                'X-ACCESS-KEY': this.apiKey,
                'X-ACCESS-NONCE': nonce,
            };
            const suffix = this.urlencode (query);
            if (method === 'GET') {
                url = suffix ? (url += '?' + suffix) : url;
                request = suffix ? (request += '?' + suffix) : request;
                const payload = {
                    nonce,
                    'verb': method,
                    'path': request,
                    'data': '',
                };
                const sign = this.getSignFromSecret (payload);
                privateHeader['X-ACCESS-SIGN'] = sign;
                headers = this.extend ({ 'accept': 'application/json;charset=UTF-8' }, privateHeader);
            } else {
                const payload = {
                    nonce,
                    'verb': method,
                    'path': request,
                    'data': JSON.stringify (query),
                };
                const sign = this.getSignFromSecret (payload);
                privateHeader['X-ACCESS-SIGN'] = sign;
                body = this.json (query, { 'convertArraysToObjects': true });
                headers = this.extend ({ 'Content-Type': 'application/json' }, privateHeader);
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return;
        }
        if (code === 400) {
            const error = this.safeValue (response, 'error');
            const errorCode = this.safeString (error, 'code');
            const feedback = this.id + ' ' + this.json (response);
            this.throwExactlyMatchedException (this.exceptions, errorCode, feedback);
            // fallback to default error handler
        }
    }

    getSignFromSecret (params) {
        const { nonce, verb, path, data } = params;
        const message = `${nonce}:${verb}${path}${data}`;
        return this.hmac (message, this.secret);
    }

    checkParams (params, arr = ['spot', 'future']) {
        if (['spot', 'future'].indexOf (this.options['defaultType']) < 0) {
            throw new BadRequest ('defaultType must be spot or future');
        }
        let type = this.options['defaultType'];
        if (params && params['type']) {
            type = params['type'];
            if (arr.indexOf (type) < 0) {
                throw new BadRequest (`params.type must be ${arr.join (',')} `);
            }
        }
    }

    dealSinceLimit (since, limit) {
        const result = {};
        if (since) {
            result['startDate'] = this.ymd (since);
        }
        if (limit) {
            result['pageSize'] = limit;
        }
        return result;
    }

    dealTimeFrame (timeframe) {
        const dateScale = this.timeframes[timeframe];
        if (!dateScale) {
            throw new BadRequest (`params.type must be ${Object.keys (this.timeframes)} `);
        }
        return dateScale;
    }

    dealSymbol (symbol, params) {
        this.checkParams (params);
        const type = params['type'] || this.options['defaultType'];
        const isSpot = type === 'spot' || (symbol && symbol.endsWith ('FP'));
        symbol = symbol ? (isSpot ? symbol : symbol + 'FP') : undefined;
        return symbol;
    }
};
