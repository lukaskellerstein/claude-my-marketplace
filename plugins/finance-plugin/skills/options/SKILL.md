---
name: options-strategies
description: Master options trading strategies design and analysis. Expert in calls, puts, spreads, straddles, iron condors, and complex multi-leg strategies. Use when designing options positions, analyzing risk/reward profiles, hedging portfolios, income generation, volatility trading, or evaluating options combinations for specific market outlooks.
---

# Options Strategies Skill

Design, analyze, and optimize options trading strategies with comprehensive understanding of risk profiles, Greeks, breakeven analysis, and market condition suitability.

## When to Use This Skill

1. **Strategy Design** - Creating options positions for specific goals
2. **Risk Analysis** - Evaluating max profit/loss and breakeven points
3. **Income Generation** - Covered calls, cash-secured puts, spreads
4. **Hedging Portfolios** - Protective puts, collars, risk mitigation
5. **Volatility Trading** - Straddles, strangles, iron condors
6. **Directional Bets** - Bullish, bearish, neutral strategies
7. **Capital Efficiency** - Leveraging positions with defined risk
8. **Greeks Analysis** - Delta, gamma, theta, vega impact
9. **Cost Reduction** - Spreads to reduce premium costs
10. **Market Conditions** - Strategy selection for different environments
11. **Earnings Plays** - Pre/post-earnings strategies
12. **Assignment Risk** - Understanding exercise and assignment
13. **Rolling Positions** - Adjusting existing positions
14. **Multi-Leg Combos** - Complex strategy construction
15. **Tax Optimization** - Timing and wash sale considerations

## Quick Start

```python
# Basic options strategy analyzer
class OptionsStrategy:
    def __init__(self, name, legs):
        self.name = name
        self.legs = legs  # [(type, strike, premium, quantity)]

    def calculate_pnl(self, stock_price):
        """Calculate P&L at given stock price"""
        total_pnl = 0
        for leg_type, strike, premium, qty in self.legs:
            if leg_type == "long_call":
                pnl = (max(stock_price - strike, 0) - premium) * 100 * qty
            elif leg_type == "short_call":
                pnl = (premium - max(stock_price - strike, 0)) * 100 * qty
            elif leg_type == "long_put":
                pnl = (max(strike - stock_price, 0) - premium) * 100 * qty
            elif leg_type == "short_put":
                pnl = (premium - max(strike - stock_price, 0)) * 100 * qty
            total_pnl += pnl
        return total_pnl

    def breakeven_points(self):
        """Find breakeven stock prices"""
        prices = range(0, 200)
        breakevens = []
        for i in range(len(prices) - 1):
            pnl1 = self.calculate_pnl(prices[i])
            pnl2 = self.calculate_pnl(prices[i + 1])
            if (pnl1 < 0 and pnl2 >= 0) or (pnl1 >= 0 and pnl2 < 0):
                breakevens.append(prices[i])
        return breakevens

    def max_profit_loss(self):
        """Calculate max profit and max loss"""
        prices = range(0, 200)
        pnls = [self.calculate_pnl(p) for p in prices]
        return max(pnls), min(pnls)
```

## Common Options Strategies

### Bullish Strategies

- **Long Call**: Unlimited upside, limited risk (premium paid)
- **Bull Call Spread**: Lower cost, capped profit (long lower strike, short higher strike)
- **Cash-Secured Put**: Income + potential stock acquisition at discount
- **Covered Call**: Income on existing shares, capped upside

### Bearish Strategies

- **Long Put**: Profit from decline, limited risk (premium paid)
- **Bear Put Spread**: Lower cost, capped profit (long higher strike, short lower strike)
- **Covered Put**: Income on short stock position
- **Bear Call Spread**: Income strategy, profit if stock stays below short strike

### Neutral Strategies

- **Iron Condor**: Income from low volatility (short strangle + long strangle protection)
- **Butterfly Spread**: Profit from minimal movement, limited risk
- **Calendar Spread**: Profit from time decay, different expirations
- **Straddle**: Profit from large move either direction (long call + long put same strike)
- **Strangle**: Lower cost than straddle (long call + long put different strikes)

### Volatility Strategies

- **Long Straddle/Strangle**: Profit from volatility expansion
- **Short Straddle/Strangle**: Income from volatility contraction (undefined risk)
- **Iron Butterfly**: Income from low volatility with defined risk
- **Ratio Spreads**: Profit from specific price range and volatility views

## Strategy Analysis Framework

```python
def analyze_strategy(strategy, current_price, days_to_expiration):
    """Comprehensive strategy analysis"""

    analysis = {
        "max_profit": strategy.max_profit_loss()[0],
        "max_loss": strategy.max_profit_loss()[1],
        "breakeven_points": strategy.breakeven_points(),
        "risk_reward_ratio": None,
        "ideal_outcome": None,
        "theta_impact": None,  # Time decay
        "vega_impact": None,   # Volatility sensitivity
        "delta": None,         # Directional exposure
        "capital_required": None,
        "probability_of_profit": None
    }

    # Calculate risk/reward
    max_profit, max_loss = strategy.max_profit_loss()
    if max_loss < 0:
        analysis["risk_reward_ratio"] = max_profit / abs(max_loss)

    # Describe ideal outcome
    if max_profit == float('inf'):
        analysis["ideal_outcome"] = "Stock moves significantly higher"
    elif "straddle" in strategy.name.lower():
        analysis["ideal_outcome"] = "Large price movement in either direction"
    elif "condor" in strategy.name.lower():
        analysis["ideal_outcome"] = "Stock stays within profit range until expiration"

    return analysis
```

## Greeks Impact

```python
# Simplified Greeks explanation
greeks_guide = {
    "delta": {
        "definition": "Rate of change in option price per $1 stock move",
        "call_range": "0 to 1.0",
        "put_range": "-1.0 to 0",
        "interpretation": "0.50 delta = option moves $0.50 for $1 stock move"
    },
    "gamma": {
        "definition": "Rate of change in delta per $1 stock move",
        "high_when": "At-the-money, near expiration",
        "interpretation": "Higher gamma = delta changes faster"
    },
    "theta": {
        "definition": "Time decay per day",
        "sign": "Negative for long options, positive for short options",
        "interpretation": "-0.05 theta = option loses $5/day in value"
    },
    "vega": {
        "definition": "Change in option price per 1% change in IV",
        "high_when": "Long-dated options, at-the-money",
        "interpretation": "0.10 vega = option gains $10 if IV increases 1%"
    }
}
```

## Strategy Selection Guide

```python
def recommend_strategy(market_outlook, risk_tolerance, goal):
    """Recommend strategy based on investor profile"""

    if market_outlook == "bullish":
        if risk_tolerance == "high":
            return "Long Call (unlimited upside, lose premium if wrong)"
        else:
            return "Bull Call Spread (defined risk, lower cost, capped profit)"

    elif market_outlook == "bearish":
        if risk_tolerance == "high":
            return "Long Put (profit from decline, limited risk)"
        else:
            return "Bear Put Spread (defined risk, lower cost)"

    elif market_outlook == "neutral":
        if goal == "income" and risk_tolerance == "medium":
            return "Iron Condor (income from range-bound stock, defined risk)"
        elif goal == "income" and risk_tolerance == "low":
            return "Covered Call (income on existing shares)"

    elif market_outlook == "volatile":
        return "Long Straddle or Strangle (profit from big move either way)"

    elif market_outlook == "low_volatility":
        return "Short Straddle or Iron Butterfly (income from stable prices)"

    return "Consult with financial advisor for personalized strategy"
```

## Risk Management

```python
# Key risk considerations
risk_checklist = {
    "position_sizing": "Never risk more than 1-2% of portfolio per trade",
    "defined_risk": "Prefer spreads with defined max loss over naked options",
    "liquidity": "Trade options with tight bid-ask spreads and volume",
    "assignment_risk": "Monitor short options near expiration and earnings",
    "early_exercise": "Understand early exercise on dividends and deep ITM puts",
    "margin_requirements": "Know capital requirements for short options",
    "black_swan_events": "Undefined risk strategies vulnerable to gaps",
    "volatility_crush": "Post-earnings IV drop hurts long options",
    "time_decay": "Long options lose value daily (theta decay)",
    "exit_strategy": "Plan exit before entering (profit target, stop loss)"
}
```

## Practical Examples

```python
# Example 1: Bull Call Spread on XYZ at $100
bull_call = OptionsStrategy("Bull Call Spread", [
    ("long_call", 100, 3.00, 1),   # Buy $100 call for $3
    ("short_call", 110, 1.00, -1)  # Sell $110 call for $1
])
# Net debit: $2.00 ($200 per spread)
# Max profit: $8.00 ($800) if stock above $110
# Max loss: $2.00 ($200) if stock below $100
# Breakeven: $102

# Example 2: Iron Condor on SPY at $450
iron_condor = OptionsStrategy("Iron Condor", [
    ("long_put", 440, 1.50, 1),    # Buy $440 put protection
    ("short_put", 445, 2.50, -1),  # Sell $445 put
    ("short_call", 455, 2.50, -1), # Sell $455 call
    ("long_call", 460, 1.50, 1)    # Buy $460 call protection
])
# Net credit: $2.00 ($200 per IC)
# Max profit: $2.00 if stock between $445-$455 at expiration
# Max loss: $3.00 ($300) if stock outside wings
# Breakeven: $443 and $457

# Example 3: Protective Put (portfolio hedge)
protective_put = OptionsStrategy("Protective Put", [
    # Own 100 shares of stock at $100
    ("long_put", 95, 2.00, 1)  # Buy $95 put for $2 (insurance)
])
# Cost: $200 for insurance
# Protects against drops below $95
# Like buying insurance on stock holdings
```

## Related Skills

- **technical-analysis**: Chart patterns inform options timing
- **risk-management**: Position sizing and portfolio protection
- **portfolio-optimization**: Options for hedging and income enhancement

This skill provides comprehensive options strategy design, analysis, and risk management for informed trading decisions.

**DISCLAIMER**: Options trading involves significant risk and is not suitable for all investors. This skill provides educational information only, not investment advice. Consult a licensed financial advisor before trading options.
