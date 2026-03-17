# openpyxl API Quick Reference

## Workbook & Worksheet

```python
from openpyxl import Workbook, load_workbook

# Create new
wb = Workbook()
ws = wb.active                      # Default sheet
ws.title = "Data"
ws2 = wb.create_sheet("Sheet2")     # Add sheet
ws3 = wb.create_sheet("First", 0)   # Insert at position

# Load existing
wb = load_workbook("file.xlsx")                    # Preserves formulas as strings
wb = load_workbook("file.xlsx", data_only=True)    # Reads cached values (WARNING: saving loses formulas)
wb = load_workbook("file.xlsx", read_only=True)    # Memory-efficient reading

# Sheet access
ws = wb["SheetName"]
wb.sheetnames                       # List of sheet names
wb.remove(ws)                       # Delete sheet
wb.copy_worksheet(ws)               # Copy sheet
```

## Cell Operations

```python
# Read/write
ws["A1"] = "Hello"
ws["B2"] = 42
ws["C3"] = "=SUM(A1:A10)"          # Formula (as string)
ws.cell(row=1, column=1, value="Hello")  # By row/col (1-indexed)

# Read value
val = ws["A1"].value                # String/number/formula
val = ws.cell(row=1, column=1).value

# Ranges
for row in ws.iter_rows(min_row=1, max_row=10, min_col=1, max_col=5):
    for cell in row:
        print(cell.value)

for col in ws.iter_cols(min_row=1, max_row=10):
    for cell in col:
        print(cell.value)

# Append row
ws.append(["Col1", "Col2", "Col3"])

# Merge/unmerge
ws.merge_cells("A1:D1")
ws.unmerge_cells("A1:D1")
```

## Formatting

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers

# Font
ws["A1"].font = Font(
    name="Arial",
    size=12,
    bold=True,
    italic=False,
    color="FF0000",          # Red (RRGGBB or AARRGGBB)
    underline="single",      # "single", "double", "singleAccounting", "doubleAccounting"
)

# Fill
ws["A1"].fill = PatternFill(
    fill_type="solid",       # "solid", "darkGray", "mediumGray", "lightGray", "gray125", "gray0625"
    start_color="FFFF00",    # Yellow
)

# Alignment
ws["A1"].alignment = Alignment(
    horizontal="center",     # "left", "center", "right", "justify"
    vertical="center",       # "top", "center", "bottom"
    wrap_text=True,
    text_rotation=0,         # 0-180 degrees
    indent=0,
)

# Border
thin_border = Border(
    left=Side(style="thin", color="000000"),
    right=Side(style="thin", color="000000"),
    top=Side(style="thin", color="000000"),
    bottom=Side(style="thin", color="000000"),
)
ws["A1"].border = thin_border
# Styles: "thin", "medium", "thick", "double", "hair", "dotted", "dashed", "dashDot"

# Number format
ws["B2"].number_format = "$#,##0.00"           # Currency
ws["B3"].number_format = "0.0%"                # Percentage
ws["B4"].number_format = "#,##0"               # Thousands
ws["B5"].number_format = "0.0x"                # Multiples
ws["B6"].number_format = "$#,##0;($#,##0);-"   # Negatives in parens, zero as dash
ws["B7"].number_format = "yyyy-mm-dd"          # Date
ws["B8"].number_format = "@"                   # Text (prevents "2024" becoming "2,024")
```

## Column & Row Dimensions

```python
# Column width (in characters)
ws.column_dimensions["A"].width = 20
ws.column_dimensions["B"].width = 15

# Row height (in points)
ws.row_dimensions[1].height = 30

# Auto-filter
ws.auto_filter.ref = "A1:E100"

# Freeze panes
ws.freeze_panes = "A2"     # Freeze first row
ws.freeze_panes = "B1"     # Freeze first column
ws.freeze_panes = "B2"     # Freeze first row and column

# Print area
ws.print_area = "A1:F50"
```

## Row/Column Operations

```python
# Insert
ws.insert_rows(2)              # Insert 1 row at position 2
ws.insert_rows(3, amount=5)    # Insert 5 rows at position 3
ws.insert_cols(2)              # Insert 1 column at position 2

# Delete
ws.delete_rows(2)
ws.delete_rows(3, amount=5)
ws.delete_cols(2)

# Move range
ws.move_range("A1:D10", rows=2, cols=3)  # Shift down 2, right 3
```

## Named Ranges

```python
from openpyxl.workbook.defined_name import DefinedName

# Create
ref = "Sheet1!$A$1:$A$10"
defn = DefinedName("DataRange", attr_text=ref)
wb.defined_names.add(defn)

# Access
for name in wb.defined_names.definedName:
    print(name.name, name.attr_text)
```

## Conditional Formatting

```python
from openpyxl.formatting.rule import (
    CellIsRule, ColorScaleRule, DataBarRule, FormulaRule
)

# Cell value rule
ws.conditional_formatting.add(
    "B2:B100",
    CellIsRule(
        operator="lessThan",
        formula=["0"],
        fill=PatternFill(start_color="FFC7CE", fill_type="solid"),
        font=Font(color="9C0006"),
    ),
)

# Color scale (green-yellow-red)
ws.conditional_formatting.add(
    "C2:C100",
    ColorScaleRule(
        start_type="min", start_color="63BE7B",
        mid_type="percentile", mid_value=50, mid_color="FFEB84",
        end_type="max", end_color="F8696B",
    ),
)

# Data bar
ws.conditional_formatting.add(
    "D2:D100",
    DataBarRule(start_type="min", end_type="max", color="638EC6"),
)

# Formula rule
ws.conditional_formatting.add(
    "A2:A100",
    FormulaRule(
        formula=['ISBLANK(A2)'],
        fill=PatternFill(start_color="FFC7CE", fill_type="solid"),
    ),
)
```

## Data Validation

```python
from openpyxl.worksheet.datavalidation import DataValidation

# Dropdown list
dv = DataValidation(type="list", formula1='"Yes,No,Maybe"', allow_blank=True)
dv.prompt = "Select an option"
dv.promptTitle = "Choice"
ws.add_data_validation(dv)
dv.add("E2:E100")

# Number range
dv_num = DataValidation(type="whole", operator="between", formula1=0, formula2=100)
ws.add_data_validation(dv_num)
dv_num.add("F2:F100")

# Date range
dv_date = DataValidation(type="date", operator="greaterThan", formula1="2024-01-01")
ws.add_data_validation(dv_date)
dv_date.add("G2:G100")
```

## Charts

```python
from openpyxl.chart import BarChart, LineChart, PieChart, ScatterChart, Reference

# Bar chart
chart = BarChart()
chart.title = "Sales by Region"
chart.x_axis.title = "Region"
chart.y_axis.title = "Sales ($)"
chart.style = 10                    # Built-in style
data = Reference(ws, min_col=2, min_row=1, max_row=10)
cats = Reference(ws, min_col=1, min_row=2, max_row=10)
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
chart.shape = 4                     # Bar shape
ws.add_chart(chart, "E2")          # Anchor position

# Stacked bar
chart.grouping = "stacked"
chart.overlap = 100

# Line chart
line = LineChart()
line.title = "Trend"
line.add_data(Reference(ws, min_col=2, min_row=1, max_row=10), titles_from_data=True)
line.set_categories(Reference(ws, min_col=1, min_row=2, max_row=10))
ws.add_chart(line, "E18")

# Pie chart
pie = PieChart()
pie.title = "Market Share"
pie.add_data(Reference(ws, min_col=2, min_row=1, max_row=5), titles_from_data=True)
pie.set_categories(Reference(ws, min_col=1, min_row=2, max_row=5))
ws.add_chart(pie, "E34")

# Scatter chart
scatter = ScatterChart()
scatter.title = "Correlation"
scatter.x_axis.title = "X"
scatter.y_axis.title = "Y"
xvalues = Reference(ws, min_col=1, min_row=2, max_row=10)
yvalues = Reference(ws, min_col=2, min_row=2, max_row=10)
from openpyxl.chart import Series
series = Series(yvalues, xvalues, title="Data")
scatter.series.append(series)
ws.add_chart(scatter, "E50")

# Chart size (in cm)
chart.width = 20
chart.height = 12
```

## Large File Handling

```python
# Write-only mode (memory efficient for large files)
wb = Workbook(write_only=True)
ws = wb.create_sheet()
for row in range(100000):
    ws.append([row, f"data_{row}", row * 1.5])
wb.save("large.xlsx")

# Read-only mode
wb = load_workbook("large.xlsx", read_only=True)
ws = wb.active
for row in ws.iter_rows():
    for cell in row:
        pass  # process
wb.close()  # Must close read-only workbooks
```

## Save

```python
wb.save("output.xlsx")
```
