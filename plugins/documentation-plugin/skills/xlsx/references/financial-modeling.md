# Financial Modeling Standards

Standards for building professional financial models in Excel. Apply these when the user requests financial models, valuation analyses, or data-driven spreadsheets with financial content.

## Color Coding Standards

Unless overridden by the user or an existing template:

| Color | RGB | Usage |
|-------|-----|-------|
| **Blue text** | (0, 0, 255) | Hardcoded inputs and scenario-adjustable numbers |
| **Black text** | (0, 0, 0) | ALL formulas and calculations |
| **Green text** | (0, 128, 0) | Links pulling from other worksheets in the same workbook |
| **Red text** | (255, 0, 0) | External links to other files |
| **Yellow background** | (255, 255, 0) | Key assumptions needing attention or cells requiring updates |

```python
from openpyxl.styles import Font, PatternFill

FONT_INPUT = Font(color="0000FF")           # Blue — hardcoded inputs
FONT_FORMULA = Font(color="000000")         # Black — formulas
FONT_CROSS_SHEET = Font(color="008000")     # Green — cross-sheet refs
FONT_EXTERNAL = Font(color="FF0000")        # Red — external links
FILL_ASSUMPTION = PatternFill("solid", start_color="FFFF00")  # Yellow — key assumptions
```

## Number Formatting Standards

| Data Type | Format Code | Example |
|-----------|-------------|---------|
| Currency | `$#,##0` | $1,234 |
| Currency (with decimals) | `$#,##0.00` | $1,234.56 |
| Currency (mm) | `$#,##0` + header "($ mm)" | $1,234 |
| Percentages | `0.0%` | 5.2% |
| Multiples | `0.0x` | 8.5x |
| Years | `@` (text) | 2024 (not 2,024) |
| Negative numbers | `$#,##0;($#,##0);-` | ($500) |
| Zeros | Display as dash via format | - |

## Formula Construction Rules

### Use Cell References, Not Hardcodes

```python
# WRONG
ws["C5"] = 1050000  # Hardcoded calculation result

# RIGHT
ws["B2"] = 1000000                    # Revenue (blue font — input)
ws["B3"] = 0.05                       # Growth rate (blue font — input)
ws["C5"] = "=B2*(1+B3)"              # Formula (black font)
ws["B2"].font = FONT_INPUT
ws["B3"].font = FONT_INPUT
ws["C5"].font = FONT_FORMULA
```

### Assumptions Placement

- Place ALL assumptions (growth rates, margins, multiples, discount rates) in dedicated assumption cells or a separate "Assumptions" sheet
- Reference assumptions by cell address in formulas
- Never embed numeric constants in formulas

### Formula Error Prevention

- Verify all cell references point to intended cells
- Check for off-by-one errors in ranges
- Ensure consistent formulas across all projection periods
- Use `IFERROR()` for division operations: `=IFERROR(B5/B6, 0)`
- Test with zero, negative, and large values

### Documentation

Comment cells with complex formulas or important assumptions. For hardcoded values, include source:
- `Source: Company 10-K, FY2024, Page 45`
- `Source: Bloomberg Terminal, 2025-08-15, AAPL US Equity`
- `Source: FactSet, 2025-08-20, Consensus Estimates`

## Common Financial Model Layouts

### DCF (Discounted Cash Flow)

```
Sheet 1: Assumptions
  - Revenue growth rates, margins, WACC, terminal growth rate

Sheet 2: Income Statement
  - Revenue → COGS → Gross Profit → OpEx → EBIT → Taxes → Net Income

Sheet 3: Cash Flow
  - EBIT → D&A → CapEx → Working Capital → Unlevered FCF

Sheet 4: DCF Valuation
  - FCF projections → PV factors → PV of FCFs → Terminal value → Enterprise value
  - Sensitivity tables (WACC vs. terminal growth)
```

### LBO (Leveraged Buyout)

```
Sheet 1: Transaction Summary
  - Entry multiples, debt tranches, equity contribution

Sheet 2: Operating Model
  - Revenue → EBITDA projections

Sheet 3: Debt Schedule
  - Mandatory amortization, cash sweep, revolver

Sheet 4: Returns Analysis
  - Exit multiples → equity proceeds → IRR, MOIC
  - Sensitivity tables (entry vs. exit multiples)
```

### Comparable Companies

```
Sheet 1: Comps Data
  - Company names, market cap, EV, revenue, EBITDA, net income

Sheet 2: Valuation Multiples
  - EV/Revenue, EV/EBITDA, P/E, calculated from Sheet 1

Sheet 3: Summary Statistics
  - Mean, median, 25th/75th percentile for each multiple
```

## Layout Best Practices

- **Row 1**: Section header (merged across columns, bold, shaded)
- **Row 2**: Column headers (bold, bottom border, light shading)
- **Column A**: Row labels (left-aligned, consistent indentation for sub-items)
- **Freeze panes** at B2 (row labels + column headers always visible)
- **Group related rows** with outline levels for collapsing detail
- **Separate sheets** for Assumptions, Financials, Valuation, Sensitivity
