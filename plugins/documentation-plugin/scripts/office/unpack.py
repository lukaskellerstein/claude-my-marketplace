#!/usr/bin/env python3
"""
Unpack an Office document (DOCX, PPTX, XLSX) for manual editing.

Extracts the ZIP archive and pretty-prints all XML files for readability.
For DOCX files, optionally merges adjacent runs and simplifies tracked changes.

Usage:
    python unpack.py input.docx [output_dir] [--merge-runs] [--simplify-redlines]
    python unpack.py input.pptx [output_dir]
    python unpack.py input.xlsx [output_dir]

Output:
    output_dir/ containing the extracted structure with pretty-printed XML.
"""

import argparse
import re
import sys
import zipfile
from pathlib import Path
from xml.dom.minidom import parseString


# Smart quote characters that need XML entity escaping
SMART_QUOTE_MAP = {
    "\u201c": "&#x201C;",  # "
    "\u201d": "&#x201D;",  # "
    "\u2018": "&#x2018;",  # '
    "\u2019": "&#x2019;",  # '
    "\u2013": "&#x2013;",  # –
    "\u2014": "&#x2014;",  # —
    "\u2026": "&#x2026;",  # …
}

SUPPORTED_EXTENSIONS = {".docx", ".pptx", ".xlsx"}


def escape_smart_quotes(xml_text: str) -> str:
    """Replace smart quote characters with XML entities for safer editing."""
    for char, entity in SMART_QUOTE_MAP.items():
        xml_text = xml_text.replace(char, entity)
    return xml_text


def pretty_print_xml(raw: str) -> str:
    """Pretty-print an XML string."""
    dom = parseString(raw)
    pretty = dom.toprettyxml(indent="  ", encoding=None)
    lines = pretty.split("\n")
    if lines and lines[0].startswith("<?xml"):
        pretty = "\n".join(lines)
    return pretty


def unpack(input_path: str, output_dir: str = None,
           merge_runs: bool = False, simplify_redlines: bool = False) -> str:
    """
    Extract an Office file and pretty-print its XML contents.

    Args:
        input_path: Path to the .docx/.pptx/.xlsx file
        output_dir: Directory to extract into. Defaults to input name without extension.
        merge_runs: If True, merge adjacent runs with identical formatting (DOCX only)
        simplify_redlines: If True, simplify tracked changes (DOCX only)

    Returns:
        Path to the unpacked directory.
    """
    input_path = Path(input_path).resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    ext = input_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")

    if output_dir:
        output_dir = Path(output_dir).resolve()
    else:
        output_dir = input_path.with_suffix("")

    # Extract the ZIP
    with zipfile.ZipFile(input_path, "r") as zf:
        zf.extractall(output_dir)

    # Pretty-print all XML and .rels files
    xml_count = 0
    for xml_file in list(output_dir.rglob("*.xml")) + list(output_dir.rglob("*.rels")):
        try:
            raw = xml_file.read_text(encoding="utf-8")
            pretty = pretty_print_xml(raw)
            pretty = escape_smart_quotes(pretty)
            xml_file.write_text(pretty, encoding="utf-8")
            xml_count += 1
        except Exception as e:
            print(f"Warning: Could not pretty-print {xml_file.relative_to(output_dir)}: {e}")

    # DOCX-specific post-processing
    if ext == ".docx":
        if merge_runs:
            try:
                from helpers.merge_runs import merge_runs_in_directory
                count = merge_runs_in_directory(output_dir)
                print(f"Merged runs in {count} files")
            except ImportError:
                # Try relative import path
                helpers_dir = Path(__file__).parent / "helpers"
                sys.path.insert(0, str(helpers_dir.parent))
                try:
                    from helpers.merge_runs import merge_runs_in_directory
                    count = merge_runs_in_directory(output_dir)
                    print(f"Merged runs in {count} files")
                except ImportError:
                    print("Warning: merge_runs helper not available")

        if simplify_redlines:
            try:
                from helpers.simplify_redlines import simplify_redlines_in_directory
                count = simplify_redlines_in_directory(output_dir)
                print(f"Simplified redlines in {count} files")
            except ImportError:
                helpers_dir = Path(__file__).parent / "helpers"
                sys.path.insert(0, str(helpers_dir.parent))
                try:
                    from helpers.simplify_redlines import simplify_redlines_in_directory
                    count = simplify_redlines_in_directory(output_dir)
                    print(f"Simplified redlines in {count} files")
                except ImportError:
                    print("Warning: simplify_redlines helper not available")

    print(f"Unpacked to: {output_dir}")
    print(f"Pretty-printed {xml_count} XML/rels files")
    return str(output_dir)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unpack an Office document for editing")
    parser.add_argument("input", help="Input file (.docx, .pptx, or .xlsx)")
    parser.add_argument("output_dir", nargs="?", default=None, help="Output directory")
    parser.add_argument("--merge-runs", action="store_true",
                        help="Merge adjacent runs with identical formatting (DOCX only)")
    parser.add_argument("--simplify-redlines", action="store_true",
                        help="Simplify tracked changes (DOCX only)")

    args = parser.parse_args()
    unpack(args.input, args.output_dir, args.merge_runs, args.simplify_redlines)
