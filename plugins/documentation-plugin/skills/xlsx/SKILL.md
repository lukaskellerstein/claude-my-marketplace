---
name: xlsx-spreadsheets
description: "This skill should be activated when the user asks to create, edit, read, or analyze Excel spreadsheet files (.xlsx, .xlsm, .csv, .tsv). Triggers for: building financial models, creating data tables, formatting spreadsheets, adding formulas, cleaning tabular data, converting between tabular formats. Also triggers when user mentions 'spreadsheet', 'Excel', 'workbook', or references an .xlsx file. Do NOT trigger when the primary deliverable is a document, presentation, or visualization."
---

# XLSX Spreadsheet Skill

Create and edit professional Excel spreadsheets using **openpyxl** for spreadsheet generation, **pandas** for data analysis, and **LibreOffice** for formula recalculation.

## Quick Reference

| Task | Go To |
|------|-------|
| Create from scratch | [Creating from Scratch](#creating-from-scratch) below |
| Edit existing XLSX | [editing.md](editing.md) |
| Read/analyze data | [Reading and Analyzing](#reading-and-analyzing) below |
| Financial models | [references/financial-modeling.md](references/financial-modeling.md) |
| openpyxl API | [references/openpyxl-api.md](references/openpyxl-api.md) |

## Setup

```bash
# Install dependencies (first time only)
pip install openpyxl pandas lxml defusedxml --break-system-packages

# Verify LibreOffice is available (required for formula recalculation)
which soffice || echo "LibreOffice not installed — install with: sudo apt install libreoffice"
```

If LibreOffice is not installed, tell the user it is needed for formula recalculation and ask if they'd like to install it. If the user declines, skip recalculation but warn that formula values will not be computed.

## Creating from Scratch

### Step 1: Understand Requirements

Define:
1. **Data structure** — what sheets, columns, rows
2. **Formulas needed** — calculations, summaries, cross-sheet references
3. **Formatting** — headers, number formats, conditional formatting, colors
4. **Charts** — any visualizations to embed
5. **Financial model?** — if yes, read [references/financial-modeling.md](references/financial-modeling.md)

### Step 2: Design Sheet Structure

Plan the workbook layout:
- Sheet names and their purpose
- Column headers and data types
- Formula dependencies between sheets
- Where totals/summaries go

Example layout:
```
Sheet 1: "Assumptions" — input parameters (blue font for editables)
Sheet 2: "Revenue"     — revenue projections (formulas referencing Assumptions)
Sheet 3: "Summary"     — summary metrics (formulas referencing Revenue)
```

### Step 3: Generate XLSX

Read [references/openpyxl-api.md](references/openpyxl-api.md) for the full API reference.

Write a Python script using openpyxl:

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()
ws = wb.active
ws.title = "Data"

# Headers
headers = ["Region", "Q1", "Q2", "Q3", "Q4", "Total"]
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", start_color="2C5F8A")
    cell.alignment = Alignment(horizontal="center")

# Data rows
data = [
    ["North", 150000, 175000, 200000, 225000],
    ["South", 120000, 130000, 145000, 160000],
    ["East",  180000, 195000, 210000, 230000],
    ["West",  95000,  110000, 125000, 140000],
]

for row_idx, row_data in enumerate(data, 2):
    for col_idx, value in enumerate(row_data, 1):
        ws.cell(row=row_idx, column=col_idx, value=value)
    # Total formula
    ws.cell(row=row_idx, column=6, value=f"=SUM(B{row_idx}:E{row_idx})")

# Column widths
ws.column_dimensions["A"].width = 15
for col in "BCDEF":
    ws.column_dimensions[col].width = 12

# Number format for currency
for row in range(2, 6):
    for col in range(2, 7):
        ws.cell(row=row, column=col).number_format = "$#,##0"

wb.save("output.xlsx")
```

### Critical Rules

- **Use formulas, not hardcoded values** — `=SUM(B2:B9)` not the pre-computed result
- **Cell indices are 1-based** — `row=1, column=1` is A1
- **Never use `data_only=True` when saving** — this permanently destroys formulas
- **Number format for years** — use `@` (text) to prevent "2024" → "2,024"
- **Always recalculate** — openpyxl writes formula strings but doesn't compute values

### Step 4: Recalculate Formulas (MANDATORY)

Every XLSX with formulas MUST be recalculated:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/recalc.py output.xlsx
```

The script returns JSON:
```json
{
  "status": "success",
  "total_errors": 0,
  "total_formulas": 42,
  "error_summary": {}
}
```

If `status` is `errors_found`, check `error_summary` for error types and locations, fix the generation script, and recalculate again.

### Step 5: QA

#### 5a: Preview

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/preview.py output.xlsx --formulas
```

Check for:
- Correct data in all cells
- Formula cells showing expected values
- No Excel errors (#REF!, #DIV/0!, etc.)

#### 5b: Schema Validation

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/validate.py output.xlsx -v
```

If validation fails, inspect errors and fix the generation script.

#### 5c: Placeholder Check

Review preview output for:
- Placeholder text ("TODO", "TBD", "Insert data here")
- Missing data or incorrect formulas
- Wrong number formats

### Step 6: Fix & Re-verify

If QA reveals issues:
1. Fix the generation script
2. Re-run to generate a new .xlsx
3. Re-run recalc.py
4. Re-run QA (Step 5)
5. Repeat until clean

## Reading and Analyzing

### Data Analysis with pandas

```python
import pandas as pd

# Read Excel
df = pd.read_excel("file.xlsx")                    # First sheet
all_sheets = pd.read_excel("file.xlsx", sheet_name=None)  # All sheets as dict

# Analyze
df.head()       # Preview data
df.info()       # Column info
df.describe()   # Statistics

# Filter, group, aggregate
result = df.groupby("Region")["Sales"].sum()

# Write back
df.to_excel("output.xlsx", index=False)
```

### Formula Inspection with openpyxl

```python
from openpyxl import load_workbook

# See formulas (not computed values)
wb = load_workbook("file.xlsx")
ws = wb.active
for row in ws.iter_rows():
    for cell in row:
        if cell.value and isinstance(cell.value, str) and cell.value.startswith("="):
            print(f"{cell.coordinate}: {cell.value}")
wb.close()

# See computed values
wb = load_workbook("file.xlsx", data_only=True)
ws = wb.active
print(ws["B10"].value)  # Cached computed value
wb.close()  # Do NOT save — would destroy formulas
```

### Quick Preview

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/preview.py file.xlsx --rows 20 --formulas
```

## Scripts

### Shared Office Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `soffice.py` | LibreOffice integration (convert, env) | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/soffice.py input.xlsx output.pdf` |
| `validate.py` | XSD schema + structural validation | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/validate.py input.xlsx [-v]` |
| `unpack.py` | Extract XLSX ZIP, pretty-print XML | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/unpack.py input.xlsx [output_dir]` |
| `pack.py` | Repack directory into XLSX ZIP | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/pack.py unpacked_dir [output.xlsx] [--validate]` |

### XLSX-Specific Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `recalc.py` | Recalculate formulas via LibreOffice | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/recalc.py input.xlsx [timeout]` |
| `preview.py` | Terminal-friendly spreadsheet preview | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/preview.py input.xlsx [--rows N] [--formulas] [--json]` |

## Reference Files

| File | When to Read |
|------|-------------|
| [references/openpyxl-api.md](references/openpyxl-api.md) | Always — openpyxl API quick reference |
| [references/financial-modeling.md](references/financial-modeling.md) | When building financial models |
| [editing.md](editing.md) | When editing existing XLSX files |

Read the reference files before generating any spreadsheet.
