#!/usr/bin/env python3
"""
Repack an unpacked Office directory into a .docx/.pptx/.xlsx file.

Condenses pretty-printed XML (removes whitespace-only text nodes) and creates
a proper ZIP with the correct structure. Optionally validates before packing.

Usage:
    python pack.py unpacked_dir [output.docx]
    python pack.py unpacked_dir output.pptx --validate
    python pack.py unpacked_dir output.docx --validate --original original.docx

Output:
    output file (defaults to unpacked_dir + appropriate extension)
"""

import argparse
import re
import sys
import zipfile
from pathlib import Path


EXTENSION_HEURISTICS = {
    "ppt": ".pptx",
    "word": ".docx",
    "xl": ".xlsx",
}


def condense_xml(xml_text: str) -> str:
    """
    Remove pretty-printing whitespace from XML while preserving content.

    Removes whitespace-only text nodes and collapses unnecessary newlines
    between tags, but preserves actual text content.
    """
    condensed = re.sub(r">\s+<", "><", xml_text)
    condensed = condensed.strip()
    return condensed


def detect_format(unpacked_dir: Path) -> str:
    """Detect the Office format from the unpacked directory structure."""
    if (unpacked_dir / "ppt").is_dir():
        return ".pptx"
    if (unpacked_dir / "word").is_dir():
        return ".docx"
    if (unpacked_dir / "xl").is_dir():
        return ".xlsx"
    return ".zip"


def pack(unpacked_dir: str, output_path: str = None,
         validate: bool = False, original: str = None,
         auto_repair: bool = False) -> str:
    """
    Pack an unpacked Office directory into a file.

    Args:
        unpacked_dir: Path to the unpacked directory
        output_path: Path for the output file.
                     Defaults to unpacked_dir + detected extension.
        validate: If True, run validation before packing
        original: Path to original file for comparison validation
        auto_repair: If True, auto-repair issues before packing

    Returns:
        Path to the generated file.
    """
    unpacked_dir = Path(unpacked_dir).resolve()
    if not unpacked_dir.is_dir():
        raise NotADirectoryError(f"Not a directory: {unpacked_dir}")

    ext = detect_format(unpacked_dir)

    if output_path:
        output_path = Path(output_path).resolve()
    else:
        output_path = unpacked_dir.with_suffix(ext)

    # [Content_Types].xml must exist
    content_types = unpacked_dir / "[Content_Types].xml"
    if not content_types.exists():
        raise FileNotFoundError(
            f"[Content_Types].xml not found in {unpacked_dir}. "
            "This doesn't look like an unpacked Office document."
        )

    # Optional validation before packing
    if validate:
        try:
            from validators import get_validator
            validator_cls = get_validator(ext)
            if validator_cls:
                validator = validator_cls(unpacked_dir, original_file=original, verbose=True)
                if auto_repair:
                    validator.repair()
                if not validator.validate():
                    print("WARNING: Validation found errors. Packing anyway.", file=sys.stderr)
        except ImportError:
            # Try with sys.path adjustment
            sys.path.insert(0, str(Path(__file__).parent))
            try:
                from validators import get_validator
                validator_cls = get_validator(ext)
                if validator_cls:
                    validator = validator_cls(unpacked_dir, original_file=original, verbose=True)
                    if auto_repair:
                        validator.repair()
                    if not validator.validate():
                        print("WARNING: Validation found errors. Packing anyway.", file=sys.stderr)
            except ImportError:
                print("Warning: Validators not available, skipping validation", file=sys.stderr)

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
        try:
            content = file_path.read_text(encoding="utf-8")
            condensed = condense_xml(content)
            zf.writestr(arcname, condensed.encode("utf-8"))
        except Exception:
            zf.write(file_path, arcname)
    else:
        zf.write(file_path, arcname)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Repack an unpacked Office document")
    parser.add_argument("unpacked_dir", help="Path to the unpacked directory")
    parser.add_argument("output", nargs="?", default=None, help="Output file path")
    parser.add_argument("--validate", action="store_true", help="Validate before packing")
    parser.add_argument("--original", default=None, help="Original file for comparison validation")
    parser.add_argument("--auto-repair", action="store_true", help="Auto-repair issues before packing")

    args = parser.parse_args()
    pack(args.unpacked_dir, args.output, args.validate, args.original, args.auto_repair)
