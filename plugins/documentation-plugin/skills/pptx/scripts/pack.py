#!/usr/bin/env python3
"""
Repack an unpacked PPTX directory into a .pptx file.

Condenses pretty-printed XML (removes whitespace-only text nodes) and creates
a proper ZIP with the correct structure.

Usage:
    python pack.py unpacked_dir [output.pptx]

Output:
    output.pptx (defaults to unpacked_dir.pptx)
"""

import re
import sys
import zipfile
from pathlib import Path


def condense_xml(xml_text: str) -> str:
    """
    Remove pretty-printing whitespace from XML while preserving content.

    Removes whitespace-only text nodes and collapses unnecessary newlines
    between tags, but preserves actual text content.
    """
    # Remove whitespace between tags (whitespace-only text nodes)
    condensed = re.sub(r">\s+<", "><", xml_text)
    # Remove leading whitespace/newlines before XML declaration
    condensed = condensed.strip()
    return condensed


def pack_pptx(unpacked_dir: str, output_path: str = None) -> str:
    """
    Pack an unpacked PPTX directory into a .pptx file.

    Args:
        unpacked_dir: Path to the unpacked PPTX directory
        output_path: Path for the output .pptx file.
                     Defaults to unpacked_dir + ".pptx".

    Returns:
        Path to the generated .pptx file.
    """
    unpacked_dir = Path(unpacked_dir).resolve()
    if not unpacked_dir.is_dir():
        raise NotADirectoryError(f"Not a directory: {unpacked_dir}")

    if output_path:
        output_path = Path(output_path).resolve()
    else:
        output_path = unpacked_dir.with_suffix(".pptx")

    # [Content_Types].xml must be the first entry in the ZIP
    content_types = unpacked_dir / "[Content_Types].xml"
    if not content_types.exists():
        raise FileNotFoundError(
            f"[Content_Types].xml not found in {unpacked_dir}. "
            "This doesn't look like an unpacked PPTX."
        )

    xml_extensions = {".xml", ".rels"}

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write [Content_Types].xml first
        _write_file_to_zip(zf, content_types, unpacked_dir, xml_extensions)

        # Write all other files
        for file_path in sorted(unpacked_dir.rglob("*")):
            if file_path.is_file() and file_path != content_types:
                _write_file_to_zip(zf, file_path, unpacked_dir, xml_extensions)

    print(f"Packed: {output_path}")
    return str(output_path)


def _write_file_to_zip(
    zf: zipfile.ZipFile,
    file_path: Path,
    base_dir: Path,
    xml_extensions: set,
) -> None:
    """Write a single file to the ZIP, condensing XML files."""
    arcname = str(file_path.relative_to(base_dir))

    if file_path.suffix.lower() in xml_extensions:
        # Condense XML before writing
        try:
            content = file_path.read_text(encoding="utf-8")
            condensed = condense_xml(content)
            zf.writestr(arcname, condensed.encode("utf-8"))
        except Exception:
            # Fall back to raw binary if condensing fails
            zf.write(file_path, arcname)
    else:
        # Binary files (images, etc.) — write as-is
        zf.write(file_path, arcname)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pack.py unpacked_dir [output.pptx]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    pack_pptx(inp, out)
