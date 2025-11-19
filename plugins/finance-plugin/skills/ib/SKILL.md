---
name: interactive-brokers
description: Expert in Interactive Brokers TWS API and ibapi Python library for automated trading. Masters connection management, order execution, market data streaming, account management, historical data retrieval, and portfolio tracking. Use when building automated trading systems, implementing order strategies, streaming real-time data, managing IB accounts programmatically, or integrating IB with trading algorithms.
---

# Interactive Brokers TWS API Skill

Build production-grade automated trading systems using Interactive Brokers API with proper connection handling, order management, real-time data streaming, and risk controls.

## When to Use This Skill

1. **Automated Trading** - Building algorithmic trading systems
2. **Order Execution** - Programmatic order placement and management
3. **Market Data Streaming** - Real-time price feeds and tick data
4. **Historical Data** - Downloading historical bars and ticks
5. **Account Management** - Portfolio tracking and account info
6. **Options Trading** - Options chains, Greeks, and execution
7. **Multi-Account** - Managing multiple IB accounts
8. **Risk Management** - Position monitoring and automatic stops
9. **Backtesting Integration** - Live trading with backtest systems
10. **Scanner Integration** - Market scanners and watchlists
11. **News Feed** - Real-time news integration
12. **Order Types** - Complex order types (bracket, OCA, etc.)
13. **Contract Details** - Security master data retrieval
14. **P&L Tracking** - Real-time profit/loss monitoring
15. **Paper Trading** - Testing with IB paper account

## Installation and Setup

```bash
# Install ibapi (latest version)
pip install ibapi

# TWS/Gateway ports:
# TWS Live: 7497
# TWS Paper: 7498
# Gateway Live: 4001
# Gateway Paper: 4002

# Enable API in TWS:
# File > Global Configuration > API > Settings
# - Enable ActiveX and Socket Clients
# - Set Socket port (7497 or 7498)
# - Uncheck "Read-Only API"
# - Add trusted IP (127.0.0.1)
```

## Quick Start - Basic Connection

```python
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order
import threading
import time

class IBApp(EWrapper, EClient):
    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.connected = False

    def nextValidId(self, orderId: int):
        """Called when connection established"""
        super().nextValidId(orderId)
        self.nextOrderId = orderId
        self.connected = True
        print(f"Connected. Next order ID: {orderId}")

    def error(self, reqId, errorCode, errorString, advancedOrderReject=""):
        """Handle errors and warnings"""
        if errorCode in [2104, 2106, 2158]:  # Info messages
            print(f"Info: {errorString}")
        elif errorCode >= 2000:  # Warnings
            print(f"Warning {errorCode}: {errorString}")
        else:  # Errors
            print(f"Error {errorCode}: {errorString}")

# Connect to IB
app = IBApp()
app.connect("127.0.0.1", 7497, clientId=1)

# Run message loop in thread
api_thread = threading.Thread(target=app.run, daemon=True)
api_thread.start()

# Wait for connection
time.sleep(1)
```

## Connection Manager with Reconnection

```python
import time
import threading
from ibapi.client import EClient
from ibapi.wrapper import EWrapper

class IBConnection:
    """Production-ready connection handler"""

    def __init__(self, host="127.0.0.1", port=7497, client_id=1):
        self.host = host
        self.port = port
        self.client_id = client_id
        self.app = None
        self.thread = None
        self.reconnect_attempts = 0
        self.max_reconnect = 5

    def connect(self):
        """Connect with timeout and validation"""
        try:
            self.app = IBApp()
            self.app.connect(self.host, self.port, self.client_id)

            self.thread = threading.Thread(target=self.app.run, daemon=True)
            self.thread.start()

            # Wait for connection with timeout
            timeout = 10
            start = time.time()
            while not self.app.connected and (time.time() - start) < timeout:
                time.sleep(0.1)

            if self.app.connected:
                print(f"Connected to IB on port {self.port}")
                self.reconnect_attempts = 0
                return True
            else:
                print("Connection timeout")
                return False

        except Exception as e:
            print(f"Connection error: {e}")
            return False

    def disconnect(self):
        """Graceful disconnect"""
        if self.app and self.app.isConnected():
            self.app.disconnect()
            time.sleep(0.5)
            print("Disconnected from IB")

    def reconnect(self):
        """Reconnect with exponential backoff"""
        if self.reconnect_attempts >= self.max_reconnect:
            print("Max reconnection attempts reached")
            return False

        wait = 2 ** self.reconnect_attempts
        print(f"Reconnecting in {wait}s (attempt {self.reconnect_attempts + 1})")
        time.sleep(wait)

        self.reconnect_attempts += 1
        self.disconnect()
        return self.connect()

    def is_connected(self):
        """Check connection status"""
        return self.app and self.app.isConnected()

# Usage
conn = IBConnection(port=7497)  # Live
# conn = IBConnection(port=7498)  # Paper
if conn.connect():
    app = conn.app
```

## Contract Creation

```python
from ibapi.contract import Contract

class ContractFactory:
    """Create IB contract objects"""

    @staticmethod
    def stock(symbol, exchange="SMART", currency="USD"):
        """US stock contract"""
        contract = Contract()
        contract.symbol = symbol
        contract.secType = "STK"
        contract.exchange = exchange
        contract.currency = currency
        return contract

    @staticmethod
    def option(symbol, expiry, strike, right, exchange="SMART", multiplier="100"):
        """Option contract

        Args:
            expiry: "YYYYMMDD" format
            right: "C" or "P"
        """
        contract = Contract()
        contract.symbol = symbol
        contract.secType = "OPT"
        contract.exchange = exchange
        contract.currency = "USD"
        contract.lastTradeDateOrContractMonth = expiry
        contract.strike = strike
        contract.right = right
        contract.multiplier = multiplier
        return contract

    @staticmethod
    def future(symbol, expiry, exchange, currency="USD", multiplier=""):
        """Futures contract"""
        contract = Contract()
        contract.symbol = symbol
        contract.secType = "FUT"
        contract.exchange = exchange
        contract.currency = currency
        contract.lastTradeDateOrContractMonth = expiry
        if multiplier:
            contract.multiplier = multiplier
        return contract

    @staticmethod
    def forex(base, quote="USD", exchange="IDEALPRO"):
        """Forex pair"""
        contract = Contract()
        contract.symbol = base
        contract.secType = "CASH"
        contract.exchange = exchange
        contract.currency = quote
        return contract

    @staticmethod
    def index(symbol, exchange="CBOE", currency="USD"):
        """Index contract"""
        contract = Contract()
        contract.symbol = symbol
        contract.secType = "IND"
        contract.exchange = exchange
        contract.currency = currency
        return contract

    @staticmethod
    def crypto(symbol, exchange="PAXOS", currency="USD"):
        """Cryptocurrency"""
        contract = Contract()
        contract.symbol = symbol
        contract.secType = "CRYPTO"
        contract.exchange = exchange
        contract.currency = currency
        return contract

# Examples
aapl = ContractFactory.stock("AAPL")
aapl_call = ContractFactory.option("AAPL", "20241220", 180.0, "C")
es_fut = ContractFactory.future("ES", "202412", "CME")
eurusd = ContractFactory.forex("EUR", "USD")
spx = ContractFactory.index("SPX")
btc = ContractFactory.crypto("BTC")
```

## Order Types

```python
from ibapi.order import Order

class OrderFactory:
    """Create different order types"""

    @staticmethod
    def market(action, quantity):
        """Market order - immediate execution"""
        order = Order()
        order.action = action  # "BUY" or "SELL"
        order.orderType = "MKT"
        order.totalQuantity = quantity
        return order

    @staticmethod
    def limit(action, quantity, limit_price):
        """Limit order - price or better"""
        order = Order()
        order.action = action
        order.orderType = "LMT"
        order.totalQuantity = quantity
        order.lmtPrice = limit_price
        return order

    @staticmethod
    def stop(action, quantity, stop_price):
        """Stop order - triggers market order"""
        order = Order()
        order.action = action
        order.orderType = "STP"
        order.totalQuantity = quantity
        order.auxPrice = stop_price
        return order

    @staticmethod
    def stop_limit(action, quantity, stop_price, limit_price):
        """Stop-limit order"""
        order = Order()
        order.action = action
        order.orderType = "STP LMT"
        order.totalQuantity = quantity
        order.auxPrice = stop_price
        order.lmtPrice = limit_price
        return order

    @staticmethod
    def trailing_stop(action, quantity, trail_amount=None, trail_percent=None):
        """Trailing stop - follows price"""
        order = Order()
        order.action = action
        order.orderType = "TRAIL"
        order.totalQuantity = quantity

        if trail_percent is not None:
            order.trailingPercent = trail_percent
        elif trail_amount is not None:
            order.auxPrice = trail_amount

        return order

    @staticmethod
    def bracket(parent_id, action, quantity, limit_price, take_profit, stop_loss):
        """Bracket order - entry with TP and SL

        Returns list of [parent, take_profit, stop_loss] orders
        """
        # Entry order
        parent = Order()
        parent.orderId = parent_id
        parent.action = action
        parent.orderType = "LMT"
        parent.totalQuantity = quantity
        parent.lmtPrice = limit_price
        parent.transmit = False

        # Take profit
        take_profit_order = Order()
        take_profit_order.orderId = parent_id + 1
        take_profit_order.action = "SELL" if action == "BUY" else "BUY"
        take_profit_order.orderType = "LMT"
        take_profit_order.totalQuantity = quantity
        take_profit_order.lmtPrice = take_profit
        take_profit_order.parentId = parent_id
        take_profit_order.transmit = False

        # Stop loss
        stop_loss_order = Order()
        stop_loss_order.orderId = parent_id + 2
        stop_loss_order.action = "SELL" if action == "BUY" else "BUY"
        stop_loss_order.orderType = "STP"
        stop_loss_order.totalQuantity = quantity
        stop_loss_order.auxPrice = stop_loss
        stop_loss_order.parentId = parent_id
        stop_loss_order.transmit = True  # Transmit all

        return [parent, take_profit_order, stop_loss_order]

    @staticmethod
    def adaptive_limit(action, quantity, priority="Patient"):
        """Adaptive algo order

        Args:
            priority: "Patient", "Normal", "Urgent"
        """
        order = Order()
        order.action = action
        order.orderType = "LMT"
        order.totalQuantity = quantity
        order.algoStrategy = "Adaptive"
        order.algoParams = [TagValue("adaptivePriority", priority)]
        return order

# Usage examples
buy_market = OrderFactory.market("BUY", 100)
sell_limit = OrderFactory.limit("SELL", 100, 180.50)
stop_loss = OrderFactory.stop("SELL", 100, 175.00)
trail_stop = OrderFactory.trailing_stop("SELL", 100, trail_percent=2.0)
```

## Order Execution and Tracking

```python
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order

class TradingApp(EWrapper, EClient):
    """Complete trading application"""

    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.connected = False
        self.orders = {}  # Track orders
        self.positions = {}  # Track positions
        self.account_values = {}  # Track account

    def nextValidId(self, orderId: int):
        super().nextValidId(orderId)
        self.nextOrderId = orderId
        self.connected = True
        print(f"Connected. Next order ID: {orderId}")

    def place_order(self, contract, order):
        """Place order and get order ID"""
        order_id = self.nextOrderId
        self.nextOrderId += 1

        self.placeOrder(order_id, contract, order)
        self.orders[order_id] = {
            "contract": contract,
            "order": order,
            "status": "Submitted",
            "filled": 0,
            "remaining": order.totalQuantity,
            "avg_price": 0
        }

        print(f"Order {order_id}: {order.action} {order.totalQuantity} "
              f"{contract.symbol} @ {order.orderType}")
        return order_id

    def place_bracket_order(self, contract, action, quantity,
                           limit_price, take_profit, stop_loss):
        """Place bracket order (entry + TP + SL)"""
        parent_id = self.nextOrderId
        orders = OrderFactory.bracket(
            parent_id, action, quantity,
            limit_price, take_profit, stop_loss
        )

        for order in orders:
            self.placeOrder(order.orderId, contract, order)

        self.nextOrderId += 3
        print(f"Bracket order placed: {action} {quantity} {contract.symbol}")
        print(f"  Entry: ${limit_price}, TP: ${take_profit}, SL: ${stop_loss}")
        return parent_id

    def cancel_order(self, order_id):
        """Cancel order"""
        self.cancelOrder(order_id, "")
        print(f"Cancellation sent for order {order_id}")

    def modify_order(self, order_id, modified_order):
        """Modify existing order"""
        if order_id in self.orders:
            contract = self.orders[order_id]["contract"]
            self.placeOrder(order_id, contract, modified_order)
            print(f"Modified order {order_id}")

    # Callbacks
    def orderStatus(self, orderId, status, filled, remaining,
                   avgFillPrice, permId, parentId, lastFillPrice,
                   clientId, whyHeld, mktCapPrice):
        """Order status updates"""
        print(f"Order {orderId}: {status}")
        print(f"  Filled: {filled}/{filled+remaining} @ ${avgFillPrice:.2f}")

        if orderId in self.orders:
            self.orders[orderId].update({
                "status": status,
                "filled": filled,
                "remaining": remaining,
                "avg_price": avgFillPrice
            })

    def execDetails(self, reqId, contract, execution):
        """Execution details"""
        print(f"Execution: {execution.orderId}")
        print(f"  {execution.shares} shares @ ${execution.price}")
        print(f"  Time: {execution.time}")

    def error(self, reqId, errorCode, errorString, advancedOrderReject=""):
        """Error handling"""
        if errorCode in [2104, 2106, 2158]:
            return  # Ignore info messages
        print(f"Error {errorCode}: {errorString}")

# Usage
app = TradingApp()
app.connect("127.0.0.1", 7497, 1)

thread = threading.Thread(target=app.run, daemon=True)
thread.start()
time.sleep(1)

# Place orders
contract = ContractFactory.stock("AAPL")
order_id = app.place_order(contract, OrderFactory.limit("BUY", 100, 180.00))

# Place bracket order
app.place_bracket_order(contract, "BUY", 100, 180.00, 185.00, 175.00)
```

## Market Data Streaming

```python
from ibapi.client import EClient
from ibapi.wrapper import EWrapper

class MarketDataApp(EWrapper, EClient):
    """Real-time market data"""

    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.market_data = {}

    def nextValidId(self, orderId: int):
        super().nextValidId(orderId)
        self.nextOrderId = orderId
        print("Connected to market data")

    def request_market_data(self, contract, req_id=None):
        """Subscribe to real-time data"""
        if req_id is None:
            req_id = len(self.market_data) + 1

        self.market_data[req_id] = {
            "symbol": contract.symbol,
            "bid": None,
            "ask": None,
            "last": None,
            "close": None,
            "volume": None
        }

        # Request market data
        # genericTickList: "233" for RTVolume (time & sales)
        self.reqMktData(req_id, contract, "233", False, False, [])
        print(f"Subscribed to {contract.symbol} (ID: {req_id})")
        return req_id

    def cancel_market_data(self, req_id):
        """Unsubscribe from market data"""
        self.cancelMktData(req_id)
        if req_id in self.market_data:
            del self.market_data[req_id]
        print(f"Unsubscribed from req_id {req_id}")

    def tickPrice(self, reqId, tickType, price, attrib):
        """Price tick updates"""
        if reqId not in self.market_data:
            return

        # TickType constants: 1=bid, 2=ask, 4=last, 9=close
        if tickType == 1:  # Bid
            self.market_data[reqId]["bid"] = price
        elif tickType == 2:  # Ask
            self.market_data[reqId]["ask"] = price
        elif tickType == 4:  # Last
            self.market_data[reqId]["last"] = price
        elif tickType == 9:  # Close
            self.market_data[reqId]["close"] = price

    def tickSize(self, reqId, tickType, size):
        """Size tick updates"""
        if reqId not in self.market_data:
            return

        # TickType: 0=bid_size, 3=ask_size, 5=last_size, 8=volume
        if tickType == 8:  # Volume
            self.market_data[reqId]["volume"] = size

    def tickString(self, reqId, tickType, value):
        """String tick updates (e.g., last timestamp)"""
        if reqId not in self.market_data:
            return

        # TickType 48 = RTVolume
        if tickType == 48:
            # Format: "price;size;time;volume;vwap;single"
            parts = value.split(';')
            if len(parts) >= 5:
                self.market_data[reqId]["last"] = float(parts[0]) if parts[0] else None
                self.market_data[reqId]["volume"] = int(parts[3]) if parts[3] else None

    def get_quote(self, req_id):
        """Get current quote"""
        return self.market_data.get(req_id, {})

    def print_quote(self, req_id):
        """Print formatted quote"""
        if req_id in self.market_data:
            data = self.market_data[req_id]
            print(f"\n{data['symbol']}:")
            print(f"  Bid: ${data['bid']}")
            print(f"  Ask: ${data['ask']}")
            print(f"  Last: ${data['last']}")
            print(f"  Volume: {data['volume']}")

# Usage
app = MarketDataApp()
app.connect("127.0.0.1", 7497, 1)

thread = threading.Thread(target=app.run, daemon=True)
thread.start()
time.sleep(1)

# Subscribe to stocks
aapl = ContractFactory.stock("AAPL")
tsla = ContractFactory.stock("TSLA")

req_id_aapl = app.request_market_data(aapl)
req_id_tsla = app.request_market_data(tsla)

time.sleep(2)
app.print_quote(req_id_aapl)
app.print_quote(req_id_tsla)
```

## Historical Data

```python
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
import pandas as pd

class HistoricalDataApp(EWrapper, EClient):
    """Historical data retrieval"""

    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.historical_data = {}

    def nextValidId(self, orderId: int):
        super().nextValidId(orderId)
        self.nextOrderId = orderId

    def request_historical_data(self, contract, duration="1 M", bar_size="1 day",
                               what_to_show="TRADES", use_rth=1):
        """Request historical bars

        Args:
            duration: "1 D", "1 W", "1 M", "1 Y", etc.
            bar_size: "1 sec", "5 secs", "1 min", "5 mins", "15 mins",
                     "30 mins", "1 hour", "1 day", "1 week", "1 month"
            what_to_show: "TRADES", "MIDPOINT", "BID", "ASK", "BID_ASK",
                         "HISTORICAL_VOLATILITY", "OPTION_IMPLIED_VOLATILITY"
            use_rth: 1 for regular hours only, 0 for all hours
        """
        req_id = len(self.historical_data) + 1
        self.historical_data[req_id] = []

        # End date/time (empty = now)
        end_datetime = ""

        self.reqHistoricalData(
            req_id, contract, end_datetime, duration,
            bar_size, what_to_show, use_rth, 1, False, []
        )

        print(f"Requested {duration} of {bar_size} bars for {contract.symbol}")
        return req_id

    def historicalData(self, reqId, bar):
        """Receive historical bars"""
        self.historical_data[reqId].append({
            "date": bar.date,
            "open": bar.open,
            "high": bar.high,
            "low": bar.low,
            "close": bar.close,
            "volume": bar.volume,
            "average": bar.average,
            "barCount": bar.barCount
        })

    def historicalDataEnd(self, reqId, start, end):
        """Historical data complete"""
        print(f"Historical data complete for req {reqId}")
        print(f"  Period: {start} to {end}")
        print(f"  Bars received: {len(self.historical_data[reqId])}")

    def get_dataframe(self, req_id):
        """Convert to pandas DataFrame"""
        if req_id in self.historical_data:
            df = pd.DataFrame(self.historical_data[req_id])
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
            return df
        return None

# Usage
app = HistoricalDataApp()
app.connect("127.0.0.1", 7497, 1)

thread = threading.Thread(target=app.run, daemon=True)
thread.start()
time.sleep(1)

# Get historical data
contract = ContractFactory.stock("AAPL")
req_id = app.request_historical_data(
    contract,
    duration="6 M",
    bar_size="1 day",
    what_to_show="TRADES"
)

time.sleep(5)  # Wait for data
df = app.get_dataframe(req_id)
print(df.head())
print(df.tail())
```

## Account and Portfolio

```python
class AccountApp(EWrapper, EClient):
    """Account and portfolio management"""

    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.account_values = {}
        self.positions = {}
        self.pnl = {}

    def nextValidId(self, orderId: int):
        super().nextValidId(orderId)
        self.nextOrderId = orderId
        self.request_account_updates()
        self.request_positions()

    def request_account_updates(self, account=""):
        """Request account updates"""
        self.reqAccountUpdates(True, account)

    def request_positions(self):
        """Request all positions"""
        self.reqPositions()

    def request_pnl(self, account):
        """Request P&L updates"""
        self.reqPnL(7001, account, "")

    def updateAccountValue(self, key, val, currency, accountName):
        """Account value updates"""
        self.account_values[key] = {
            "value": val,
            "currency": currency,
            "account": accountName
        }

    def position(self, account, contract, position, avgCost):
        """Position updates"""
        key = f"{contract.symbol}_{contract.secType}"
        self.positions[key] = {
            "account": account,
            "symbol": contract.symbol,
            "secType": contract.secType,
            "position": position,
            "avgCost": avgCost,
            "contract": contract
        }

    def positionEnd(self):
        """All positions received"""
        print(f"\nPositions ({len(self.positions)}):")
        for key, pos in self.positions.items():
            print(f"  {pos['symbol']}: {pos['position']} @ ${pos['avgCost']:.2f}")

    def pnl(self, reqId, dailyPnL, unrealizedPnL, realizedPnL):
        """P&L updates"""
        self.pnl[reqId] = {
            "daily": dailyPnL,
            "unrealized": unrealizedPnL,
            "realized": realizedPnL
        }

    def get_account_value(self, key):
        """Get specific account value"""
        return self.account_values.get(key, {}).get("value")

    def get_buying_power(self):
        """Get available buying power"""
        return float(self.get_account_value("BuyingPower") or 0)

    def get_net_liquidation(self):
        """Get net liquidation value"""
        return float(self.get_account_value("NetLiquidation") or 0)

    def print_account_summary(self):
        """Print account summary"""
        print("\nAccount Summary:")
        print(f"  Net Liquidation: ${self.get_net_liquidation():,.2f}")
        print(f"  Buying Power: ${self.get_buying_power():,.2f}")
        print(f"  Cash: ${float(self.get_account_value('TotalCashValue') or 0):,.2f}")

# Usage
app = AccountApp()
app.connect("127.0.0.1", 7497, 1)

thread = threading.Thread(target=app.run, daemon=True)
thread.start()
time.sleep(2)

app.print_account_summary()
```

## Options Chain

```python
class OptionsApp(EWrapper, EClient):
    """Options chain and Greeks"""

    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.options_chains = {}

    def nextValidId(self, orderId: int):
        super().nextValidId(orderId)
        self.nextOrderId = orderId

    def request_contract_details(self, contract):
        """Request contract details (for options chain)"""
        req_id = len(self.options_chains) + 1
        self.options_chains[req_id] = []
        self.reqContractDetails(req_id, contract)
        return req_id

    def contractDetails(self, reqId, contractDetails):
        """Receive contract details"""
        self.options_chains[reqId].append(contractDetails)

    def contractDetailsEnd(self, reqId):
        """Contract details complete"""
        print(f"Received {len(self.options_chains[reqId])} option contracts")

    def get_options_chain(self, symbol, expiry=None):
        """Get full options chain for symbol

        Args:
            symbol: Underlying symbol
            expiry: Specific expiry "YYYYMMDD" or None for all
        """
        # Request options
        contract = Contract()
        contract.symbol = symbol
        contract.secType = "OPT"
        contract.exchange = "SMART"
        contract.currency = "USD"

        if expiry:
            contract.lastTradeDateOrContractMonth = expiry

        req_id = self.request_contract_details(contract)

        # Wait for data
        time.sleep(3)

        # Parse results
        options = []
        for detail in self.options_chains.get(req_id, []):
            c = detail.contract
            options.append({
                "symbol": c.symbol,
                "expiry": c.lastTradeDateOrContractMonth,
                "strike": c.strike,
                "right": c.right,
                "conId": c.conId
            })

        return pd.DataFrame(options)

# Usage
app = OptionsApp()
app.connect("127.0.0.1", 7497, 1)

thread = threading.Thread(target=app.run, daemon=True)
thread.start()
time.sleep(1)

# Get options chain
chain = app.get_options_chain("AAPL", "20241220")
print(chain)

# Filter calls at specific strike
calls_180 = chain[(chain['right'] == 'C') & (chain['strike'] == 180)]
print(calls_180)
```

## Complete Trading Bot Example

```python
import time
import threading
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract

class SimpleTradingBot(EWrapper, EClient):
    """Complete trading bot example"""

    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.connected = False
        self.positions = {}
        self.market_data = {}
        self.account_values = {}

    def nextValidId(self, orderId: int):
        super().nextValidId(orderId)
        self.nextOrderId = orderId
        self.connected = True

        # Initialize
        self.reqPositions()
        self.reqAccountUpdates(True, "")

    def position(self, account, contract, position, avgCost):
        """Track positions"""
        key = contract.symbol
        self.positions[key] = {
            "position": position,
            "avgCost": avgCost,
            "contract": contract
        }

    def updateAccountValue(self, key, val, currency, accountName):
        """Track account values"""
        self.account_values[key] = val

    def tickPrice(self, reqId, tickType, price, attrib):
        """Track prices"""
        if reqId in self.market_data:
            if tickType == 4:  # Last price
                self.market_data[reqId]["last"] = price

    def run_strategy(self):
        """Main strategy loop"""
        # Define symbols to trade
        symbols = ["AAPL", "MSFT", "GOOGL"]

        # Subscribe to market data
        for i, symbol in enumerate(symbols):
            contract = ContractFactory.stock(symbol)
            req_id = i + 1
            self.market_data[req_id] = {"symbol": symbol, "last": None}
            self.reqMktData(req_id, contract, "", False, False, [])

        # Strategy loop
        while self.connected:
            time.sleep(60)  # Check every minute

            # Example strategy: Buy if no position and price > threshold
            for req_id, data in self.market_data.items():
                symbol = data["symbol"]
                price = data.get("last")

                if price is None:
                    continue

                # Check if we have position
                has_position = symbol in self.positions

                # Simple strategy logic
                if not has_position and price > 150:
                    # Buy signal
                    contract = ContractFactory.stock(symbol)
                    order = OrderFactory.limit("BUY", 10, price)
                    order_id = self.nextOrderId
                    self.nextOrderId += 1
                    self.placeOrder(order_id, contract, order)
                    print(f"BUY {symbol} @ ${price}")

                elif has_position:
                    pos = self.positions[symbol]
                    pnl_percent = ((price - pos["avgCost"]) / pos["avgCost"]) * 100

                    # Take profit at 5% or stop loss at -2%
                    if pnl_percent >= 5 or pnl_percent <= -2:
                        contract = ContractFactory.stock(symbol)
                        order = OrderFactory.market("SELL", abs(pos["position"]))
                        order_id = self.nextOrderId
                        self.nextOrderId += 1
                        self.placeOrder(order_id, contract, order)
                        print(f"SELL {symbol} @ ${price} (P&L: {pnl_percent:.2f}%)")

    def error(self, reqId, errorCode, errorString, advancedOrderReject=""):
        if errorCode not in [2104, 2106, 2158]:
            print(f"Error {errorCode}: {errorString}")

# Run bot
bot = SimpleTradingBot()
bot.connect("127.0.0.1", 7498, 1)  # Paper trading

api_thread = threading.Thread(target=bot.run, daemon=True)
api_thread.start()

time.sleep(2)

# Run strategy
strategy_thread = threading.Thread(target=bot.run_strategy, daemon=True)
strategy_thread.start()

# Keep running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nShutting down...")
    bot.disconnect()
```

## Best Practices

### Connection Management

- Always run `app.run()` in separate thread
- Implement reconnection logic with exponential backoff
- Use paper trading (port 7498) for testing
- Handle connection timeouts gracefully
- Check `isConnected()` before API calls

### Order Management

- Always wait for `nextValidId` before placing orders
- Track order IDs and status
- Implement order confirmation before execution
- Use `transmit=False` for bracket orders (except last)
- Cancel orders on shutdown

### Market Data

- Unsubscribe from data when not needed
- Limit concurrent data subscriptions (< 100)
- Use snapshot data for one-time quotes
- Handle delayed data for non-professionals
- Check data permissions for symbol

### Risk Controls

- Implement position size limits
- Set maximum loss per trade
- Use stop losses on all positions
- Monitor account buying power
- Implement circuit breakers

### Error Handling

- Handle all error codes appropriately
- Log errors for debugging
- Retry failed orders with limits
- Validate contracts before trading
- Check order acknowledgments

### Performance

- Reuse connections (don't reconnect per request)
- Use threading for concurrent operations
- Cache contract details
- Batch historical data requests
- Minimize API calls

## Common Error Codes

```python
ERROR_CODES = {
    200: "No security definition found",
    201: "Order rejected - reason in message",
    202: "Order cancelled",
    203: "Security not allowed to short",
    300: "Cannot find EId with ticker Id",
    321: "Invalid date format",
    322: "Invalid contract",
    354: "Requested market data not subscribed",
    366: "No historical data found",
    2104: "Market data farm connection OK",
    2106: "HMDS data farm connection OK",
    2110: "Connectivity lost",
    2158: "Sec-def data farm connection OK"
}
```

## Related Skills

- **options-strategies**: Use with options chain data for strategy implementation
- **backtesting**: Integrate live trading with backtest systems
- **risk-management**: Position sizing and stop loss implementation

**DISCLAIMER**: This skill provides educational information for algorithmic trading with Interactive Brokers API. Trading involves significant risk of loss. Use paper trading extensively before live trading. Not financial advice. Consult licensed professionals before trading with real money.
