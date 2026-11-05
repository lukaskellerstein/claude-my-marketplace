# todo export

```
todo export --csv [-o <file>] [--force]
```

Writes every open task of the active lists as RFC 4180 CSV with the header `title,list`.
Exit codes: 0 ok · 3 the output file exists and `--force` is absent.
