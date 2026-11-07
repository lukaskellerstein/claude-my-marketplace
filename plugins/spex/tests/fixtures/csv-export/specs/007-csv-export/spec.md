# CSV export

## Why
I want to get my open tasks into a spreadsheet, and today I retype them by hand.

## What
- `todo export --csv` prints RFC 4180 CSV of the open tasks, grouped by list.

## Not this
- No XLSX, no upload to a sheet service. CSV on stdout or into a file, nothing more.

## Success
- One command, one file, and it opens in a spreadsheet with the right columns.
- It never overwrites a file I already have unless I say so.
