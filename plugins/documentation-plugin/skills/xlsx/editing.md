# Editing Existing XLSX Files

Guide for modifying existing Excel files — updating data, formulas, formatting, and preserving structure.

## When to Use

- Updating data or formulas in an existing spreadsheet
- Adding/removing sheets, rows, or columns
- Modifying cell formatting or styles
- Fixing formula errors
- Adding charts or conditional formatting
- Advanced XML-level editing for features openpyxl doesn't support

## Approach Decision

### Use openpyxl (Default)

Best for most editing tasks:
- Changing cell values, formulas, formatting
- Adding/removing rows, columns, sheets
- Adding charts, data validation, conditional formatting
- Preserving existing formulas and styles

### Use Direct XML Editing

For features openpyxl doesn't support or when precision matters:
- Custom XML elements or attributes
- Preserving exact XML structure from templates
- Fixing corruption at the XML level
- Advanced SpreadsheetML features

## Workflow: openpyxl Editing

### Step 1: Analyze

Preview the file to understand its structure:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/preview.py input.xlsx --formulas
```

For data analysis:
```python
import pandas as pd
df = pd.read_excel("input.xlsx", sheet_name=None)  # All sheets
for name, sheet_df in df.items():
    print(f"\n{name}: {sheet_df.shape}")
    print(sheet_df.head())
```

### Step 2: Load and Modify

```python
from openpyxl import load_workbook

# IMPORTANT: Do NOT use data_only=True if you want to preserve formulas
wb = load_workbook("input.xlsx")
ws = wb.active

# Modify cells
ws["A1"] = "Updated Value"
ws["B5"] = "=SUM(B2:B4)"

# Add rows
ws.insert_rows(3)
ws.cell(row=3, column=1, value="New Row")

# Save
wb.save("output.xlsx")
```

### Step 3: Recalculate Formulas (MANDATORY)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/recalc.py output.xlsx
```

### Step 4: QA

```bash
# Preview output
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/preview.py output.xlsx --formulas --errors-only

# Schema validation
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/validate.py output.xlsx -v
```

## Workflow: Direct XML Editing

### Step 1: Unpack

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/unpack.py input.xlsx xlsx_unpacked/
```

### Key Directory Structure

```
xlsx_unpacked/
├── [Content_Types].xml         # File type registry
├── _rels/
│   └── .rels                   # Root relationships
├── xl/
│   ├── workbook.xml            # Workbook metadata, sheet list
│   ├── sharedStrings.xml       # Shared string table
│   ├── styles.xml              # Cell styles, number formats, fonts
│   ├── calcChain.xml           # Formula calculation chain
│   ├── _rels/
│   │   └── workbook.xml.rels   # Sheet/theme relationships
│   ├── worksheets/
│   │   ├── sheet1.xml          # Sheet data (cells, formulas, formatting)
│   │   └── sheet2.xml
│   ├── charts/                 # Embedded charts
│   ├── drawings/               # Drawing objects
│   ├── media/                  # Images
│   └── theme/                  # Theme definitions
└── docProps/                   # Document metadata
```

### Step 2: Edit XML

Worksheet XML structure (`xl/worksheets/sheet1.xml`):

```xml
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s">           <!-- t="s" = shared string, t="n" = number -->
        <v>0</v>                  <!-- Index into sharedStrings.xml -->
      </c>
      <c r="B1">
        <f>SUM(B2:B10)</f>        <!-- Formula -->
        <v>150</v>                <!-- Cached value -->
      </c>
      <c r="C1" s="3">           <!-- s = style index from styles.xml -->
        <v>42.5</v>
      </c>
    </row>
  </sheetData>
</worksheet>
```

### Step 3: Pack and Validate

```bash
# Pack
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/pack.py xlsx_unpacked/ output.xlsx --validate

# Recalculate formulas
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/recalc.py output.xlsx

# QA
python3 ${CLAUDE_PLUGIN_ROOT}/skills/xlsx/scripts/preview.py output.xlsx --formulas
```

## Common Pitfalls

### data_only=True Destroys Formulas

```python
# DANGEROUS: Opening with data_only=True and saving will permanently replace formulas with values
wb = load_workbook("file.xlsx", data_only=True)
wb.save("file.xlsx")  # All formulas are now gone!

# SAFE: Use data_only=True only for reading calculated values
wb_values = load_workbook("file.xlsx", data_only=True)
val = wb_values["A1"].value  # Read cached value
wb_values.close()            # Don't save

# Edit with formulas preserved
wb = load_workbook("file.xlsx")  # No data_only flag
ws = wb.active
ws["A2"] = "=A1*2"
wb.save("file.xlsx")
```

### Cell Indexing is 1-Based

```python
# openpyxl uses 1-based indexing
ws.cell(row=1, column=1)   # A1 (correct)
ws.cell(row=0, column=0)   # Error!

# When converting from pandas (0-based) to openpyxl (1-based):
# openpyxl_row = pandas_row + 2  (header row + 0-based offset)
```

### SharedStrings Synchronization

When editing XML directly, if you modify `xl/sharedStrings.xml`:
- Update the `count` and `uniqueCount` attributes on the `<sst>` root element
- Cell references (`<v>` inside `<c t="s">`) are 0-based indices into the shared string table
- Adding new strings means appending `<si><t>New Text</t></si>` and updating counts

### Formula Recalculation is Always Required

openpyxl writes formulas as strings but does NOT calculate their values. The cached `<v>` values in the XML will be stale. Always run `recalc.py` after any formula changes.
