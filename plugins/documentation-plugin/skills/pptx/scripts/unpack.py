#!/usr/bin/env python3
"""
Unpack a PPTX file for manual editing.

Extracts the PPTX ZIP archive and pretty-prints all XML files for readability.

Usage:
    python unpack.py input.pptx [output_dir]

Output:
    output_dir/ containing the extracted PPTX structure with pretty-printed XML.
"""

import sys
import zipfile
from pathlib import Path
from xml.dom.minidom import parseString


def unpack_pptx(pptx_path: str, output_dir: str = None) -> str:
    """
    Extract a PPTX file and pretty-print its XML contents.

    Args:
        pptx_path: Path to the .pptx file
        output_dir: Directory to extract into. Defaults to input name without extension.

    Returns:
        Path to the unpacked directory.
    """
    pptx_path = Path(pptx_path).resolve()
    if not pptx_path.exists():
        raise FileNotFoundError(f"Input file not found: {pptx_path}")

    if output_dir:
        output_dir = Path(output_dir).resolve()
    else:
        output_dir = pptx_path.with_suffix("")

    # Extract the ZIP
    with zipfile.ZipFile(pptx_path, "r") as zf:
        zf.extractall(output_dir)

    # Pretty-print all XML files
    xml_count = 0
    for xml_file in output_dir.rglob("*.xml"):
        try:
            raw = xml_file.read_text(encoding="utf-8")
            dom = parseString(raw)
            pretty = dom.toprettyxml(indent="  ", encoding=None)
            # Remove the XML declaration that toprettyxml adds (keep original if present)
            lines = pretty.split("\n")
            if lines and lines[0].startswith("<?xml"):
                # Keep the declaration but normalize it
                pretty = "\n".join(lines)
            xml_file.write_text(pretty, encoding="utf-8")
            xml_count += 1
        except Exception as e:
            print(f"Warning: Could not pretty-print {xml_file.relative_to(output_dir)}: {e}")

    # Also pretty-print .rels files (they're XML too)
    for rels_file in output_dir.rglob("*.rels"):
        try:
            raw = rels_file.read_text(encoding="utf-8")
            dom = parseString(raw)
            pretty = dom.toprettyxml(indent="  ", encoding=None)
            lines = pretty.split("\n")
            if lines and lines[0].startswith("<?xml"):
                pretty = "\n".join(lines)
            rels_file.write_text(pretty, encoding="utf-8")
            xml_count += 1
        except Exception as e:
            print(f"Warning: Could not pretty-print {rels_file.relative_to(output_dir)}: {e}")

    print(f"Unpacked to: {output_dir}")
    print(f"Pretty-printed {xml_count} XML/rels files")
    return str(output_dir)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python unpack.py input.pptx [output_dir]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    unpack_pptx(inp, out)
